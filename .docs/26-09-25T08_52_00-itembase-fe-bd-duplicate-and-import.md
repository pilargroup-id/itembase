# Itembase FE Integration - Legacy SKU Import Update & Duplicate to BD

## Scope

Backend changes covered by this revision:

1. Import update for legacy SKU IDs that do not follow the current `68xxxxxxxxxx` format.
2. New action to duplicate an existing regular item into a BD item.
3. Optional `Create BD Duplicate` behavior on the Create SKU form.
4. Optional `Create SKU` + `Create BD Duplicate` behavior on the Create Parent form.
5. Barcode is intentionally reused by the source SKU and its BD duplicate.

No new columns are added to `items`.

---

## 1. Legacy SKU Import

### New rule

The 12-digit `68xxxxxxxxxx` validation only applies when the import row creates a new SKU.

Existing SKU rows are located by `SKU ID`. If the SKU already exists, its current ID may be a legacy/non-68 value and the row may still be updated.

### FE impact

No UI payload change is required for import.

Expected behavior:

- Existing legacy SKU ID -> UPDATE allowed.
- New SKU ID not matching `68xxxxxxxxxx` -> invalid.
- New SKU ID must still use the current year prefix enforced by the backend.

---

## 2. Existing Item Action: Duplicate to BD

### Endpoint

```http
POST /api/item/items/:id/duplicate-bd
```

`id` is the UUID of the source item, not the SKU ID/item code.

No request body is required.

### Source eligibility

The action is valid only when:

- source `item_kind = regular`
- source `replenishment_type != BD`
- target SKU ID `<source item_code>-BD` does not already exist

### Generated BD item

Example source:

```text
SKU ID             : 682500000123
Barcode            : 682500000123
Parent Name        : BUKU
Variant            : HITAM
Replenishment Type : RG
SKU Name           : BUKU HITAM
```

Generated item:

```text
SKU ID             : 682500000123-BD
Barcode            : 682500000123
Parent Name        : BUKU
Variant            : HITAM
Replenishment Type : BD
SKU Name           : BUKU BD HITAM
```

The duplicate copies the source item's regular item data, including:

- parent
- UOM
- quantity per pack
- dimensions
- gross weight per pack
- lead time / production time
- status
- variant values
- selling name

The backend overrides:

- `item_code` -> `<source item_code>-BD`
- `barcode` -> same barcode as source
- `replenishment_type` -> `BD`
- `item_name` -> regenerated using existing naming rule: `Parent Name + BD + Variant Values`

### Recommended FE action visibility

Show `Duplicate to BD` only for regular items whose replenishment type is not `BD`.

The backend still validates this, so FE visibility is convenience only.

### Success response

Use the normal Itembase response wrapper. `data` is the newly created BD item.

### Relevant errors

- `BD_DUPLICATE_REGULAR_ONLY` - source is not a regular item.
- `BD_DUPLICATE_SOURCE_ALREADY_BD` - source is already BD.
- `BD_DUPLICATE_ALREADY_EXISTS` - `<source SKU ID>-BD` already exists.
- `BD_DUPLICATE_CODE_TOO_LONG` - generated BD SKU ID exceeds DB limit.
- `ITEM_NOT_FOUND` - source UUID does not exist.

For conflict/error response rendering, display the backend message and do not silently retry with another SKU ID.

---

## 3. Create SKU Form

The existing create endpoint remains:

```http
POST /api/item/items
```

Add an optional boolean field:

```json
{
  "item_kind": "regular",
  "parent_id": "<parent-uuid>",
  "uom_id": "<uom-uuid>",
  "replenishment_type": "RG",
  "variants": [],
  "create_bd_duplicate": true
}
```

The rest of the existing Create SKU payload stays unchanged.

### UI

Add checkbox/action option:

```text
[ ] Create BD Duplicate
```

Recommended behavior:

- display only for `item_kind = regular`
- disable when the source `replenishment_type = BD`
- when checked, submit `create_bd_duplicate: true`
- when unchecked, omit the field or send `false`

### Backend behavior

When `create_bd_duplicate = true`:

1. Backend creates the normal SKU using the existing SKU generator.
2. Backend creates its BD duplicate in the same database transaction.
3. BD duplicate gets `<normal SKU ID>-BD`.
4. BD duplicate gets the exact same barcode as the normal SKU.
5. BD duplicate receives the same variant values.
6. BD duplicate `item_name` is regenerated with `BD` in the correct name position.

### Response addition

The normal created item remains the main `data` object.

When a BD duplicate is requested, the created item includes:

```json
{
  "id": "<normal-item-uuid>",
  "item_code": "682500000123",
  "replenishment_type": "RG",
  "bd_duplicate": {
    "id": "<bd-item-uuid>",
    "item_code": "682500000123-BD",
    "barcode": "682500000123",
    "replenishment_type": "BD"
  }
}
```

FE may use `bd_duplicate` to show a success summary/link after creation.

---

## 4. Create Parent Form + Create SKU

The existing endpoint remains:

```http
POST /api/item/item-parents
```

The new optional payload shape is:

```json
{
  "brand_id": "<brand-uuid>",
  "subbrand_id": "<subbrand-uuid>",
  "item_name": "BUKU",
  "category_id": "<category-uuid>",
  "item_type_id": "<item-source-uuid>",
  "ports": [],
  "variant_attributes": [],
  "status": "ACTIVE",

  "create_sku": true,
  "sku": {
    "uom_id": "<uom-uuid>",
    "replenishment_type": "RG",
    "qty_per_pack": 1,
    "height": null,
    "width": null,
    "depth": null,
    "gross_weight_pack": null,
    "production_time_days": null,
    "status": "ACTIVE",
    "variants": [],
    "create_bd_duplicate": true
  }
}
```

### UI behavior

Existing/expected checkbox:

```text
[ ] Create SKU
```

When unchecked:

- send `create_sku: false` or omit it
- `sku` is not required

When checked:

- send `create_sku: true`
- show the SKU fields under the parent form
- add nested checkbox `Create BD Duplicate`
- send it as `sku.create_bd_duplicate`

The backend also accepts root-level `create_bd_duplicate` for compatibility, but FE should use the nested `sku.create_bd_duplicate` form because it is clearer.

### Backend behavior

Parent + SKU + optional BD duplicate are created in one DB transaction.

If SKU or BD creation fails, the parent creation is rolled back as well.

The SKU's `parent_id` is always forced to the newly created parent UUID by the backend. FE must not try to provide a parent UUID for this nested create operation.

The initial temporary SKU name is not authoritative; after variant relations are saved, the backend regenerates the final SKU name using the standard naming rule.

### Response addition

When `create_sku = true`, the created parent contains:

```json
{
  "id": "<parent-uuid>",
  "parent_code": "P000123",
  "parent_name": "GOTO BUKU",
  "created_sku": {
    "id": "<normal-item-uuid>",
    "item_code": "682500000123",
    "barcode": "682500000123",
    "bd_duplicate": {
      "id": "<bd-item-uuid>",
      "item_code": "682500000123-BD",
      "barcode": "682500000123",
      "replenishment_type": "BD"
    }
  }
}
```

`bd_duplicate` exists only when requested.

---

## 5. Barcode Rule Change

A DB migration is required before using Duplicate to BD:

```text
backend/migrations/20260925_items_barcode_non_unique.sql
```

The old unique index on `items.barcode` is removed and replaced by a normal index.

This is intentional because the normal SKU and BD SKU represent different Itembase SKU IDs while reusing the same field barcode in operation.

`items.item_code` remains UNIQUE.

---

## 6. FE Acceptance Cases

### Existing item action

- Regular RG/SS/NR item -> Duplicate to BD action available.
- Regular BD item -> action hidden/disabled.
- Bundle -> action hidden/disabled.
- Successful duplicate -> refresh item list/detail and show generated BD SKU.
- Duplicate already exists -> show backend conflict message.

### Create SKU

- Create normal SKU with checkbox off -> only one SKU created.
- Create normal SKU with checkbox on -> normal + BD SKU created.
- Barcode shown for both records must be identical.
- BD SKU ID must be `<normal SKU ID>-BD`.
- BD SKU name must contain `BD` according to backend naming rule.

### Create Parent

- `Create SKU` off -> parent only.
- `Create SKU` on + BD option off -> parent + normal SKU.
- `Create SKU` on + BD option on -> parent + normal SKU + BD duplicate.

### Import

- Existing legacy SKU not starting with `68` -> update accepted if all other values are valid.
- New non-68 SKU -> rejected.
- New 68 SKU with wrong year prefix -> rejected.
