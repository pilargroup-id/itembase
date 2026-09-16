# ItemBase FE Integration — Replenishment Type & Item Status

## Scope

Dokumen ini hanya membahas perubahan pada ekosistem **Item/SKU**. `item_parents.status` tetap memakai status parent yang sudah ada dan tidak ikut berubah menjadi item status baru.

## 1. Replenishment Type

Field baru pada regular item:

```text
replenishment_type: RG | SS | BD | NR | null
```

Display label:

| Value | Label |
|---|---|
| `RG` | Regular |
| `SS` | Seasonal |
| `BD` | Business Driven |
| `NR` | Non Replenish |

Aturan:

- hanya berlaku untuk `item_kind = regular`;
- tidak mandatory;
- boleh `null` untuk SKU lama maupun SKU baru;
- bundle tidak boleh memiliki replenishment type;
- create/update item menerima field `replenishment_type` per item;
- matrix create menerima `replenishment_type` per row;
- `common_values.replenishment_type` juga didukung sehingga FE dapat menerapkan **Equalize Replenishments** ke seluruh row sebelum request dikirim.

Contoh row matrix:

```json
{
  "item_name": "GOTO ASAHI LUNCH BOX PINK RECTANGEL",
  "uom_id": "<uuid>",
  "replenishment_type": "BD",
  "variants": [
    { "attribute_id": "<color-uuid>", "value_id": "<pink-uuid>" },
    { "attribute_id": "<model-uuid>", "value_id": "<rectangle-uuid>" }
  ]
}
```

### Equalize Replenishments

Checkbox ini adalah behavior FE. Backend tidak menyimpan konsep `equalize`.

FE cukup meng-copy replenishment type yang dipilih ke setiap row item sebelum memanggil matrix create. Alternatifnya, kirim nilai yang sama melalui `common_values.replenishment_type` dan row yang memiliki nilai sendiri tetap dapat override common value.

## 2. Naming khusus BD

Backend sekarang menjadi source of truth untuk SKU Name regular item.

Format normal:

```text
PARENT NAME + VARIANT VALUES
```

Jika `replenishment_type = BD`:

```text
PARENT NAME + BD + VARIANT VALUES
```

Contoh:

```text
Parent Name : GOTO ASAHI LUNCH BOX
Variant     : PINK RECTANGEL
RG          : GOTO ASAHI LUNCH BOX PINK RECTANGEL
BD          : GOTO ASAHI LUNCH BOX BD PINK RECTANGEL
SS          : GOTO ASAHI LUNCH BOX PINK RECTANGEL
NR          : GOTO ASAHI LUNCH BOX PINK RECTANGEL
NULL        : GOTO ASAHI LUNCH BOX PINK RECTANGEL
```

Perubahan dari `RG/SS/NR/NULL -> BD` akan otomatis menambahkan token `BD`.
Perubahan dari `BD -> RG/SS/NR/NULL` akan otomatis menghapus token `BD`.

Backend juga regenerate SKU Name ketika parent, variant, atau replenishment type berubah.

## 3. Item Status

Field lama `items.is_active` sudah diganti menjadi:

```text
status: ACTIVE | INACTIVE | DISCONTINUE
```

Jangan lagi membaca atau mengirim `is_active` sebagai field utama Item.

Migration existing data:

```text
is_active = 1 -> ACTIVE
is_active = 0 -> INACTIVE
```

### Update status satu Item

```http
PATCH /api/item/items/:id/status
```

Body:

```json
{
  "status": "DISCONTINUE"
}
```

Valid value:

```text
ACTIVE
INACTIVE
DISCONTINUE
```

Backend masih menerima `is_active` pada endpoint patch sebagai compatibility sementara (`1 -> ACTIVE`, `0 -> INACTIVE`), tetapi FE baru harus menggunakan `status`.

## 4. Parent Status

Parent tidak ikut memakai enum Item Status.

Endpoint:

```http
PATCH /api/item/item-parents/:id/status
```

Body yang disarankan:

```json
{
  "status": "inactive"
}
```

Parent tetap menggunakan:

```text
draft
active
inactive
discontinued
```

Compatibility body lama `{ "is_active": 0|1 }` masih diterima untuk mapping `inactive/active`.

Ketika Parent berubah menjadi `inactive`, hanya child Item dengan status `ACTIVE` yang otomatis berubah menjadi `INACTIVE`. Item `DISCONTINUE` tidak ditimpa.

## 5. UOM suggestion/free-text

Create/update Item tetap mendukung dua mode:

Existing UOM:

```json
{
  "uom_id": "<uuid>"
}
```

Free text:

```json
{
  "uom_name": "Box Set"
}
```

Backend menghasilkan:

```text
name = BOX SET
code = BOX_SET
```

Jika UOM active sudah ada, data existing direuse. Jika data yang match inactive, request ditolak.

## 6. Matrix API

`POST /api/item/items/matrix/preview` dapat menerima optional:

```json
{
  "item_parent_id": "<uuid>",
  "replenishment_type": "BD",
  "attributes": []
}
```

Response combination mengandung:

```json
{
  "replenishment_type": "BD",
  "suggested_item_name": "GOTO ASAHI LUNCH BOX BD PINK RECTANGEL"
}
```

Pada final matrix create:

```http
POST /api/item/items/matrix
```

Replenishment dapat dikirim per row:

```json
{
  "item_parent_id": "<uuid>",
  "items": [
    {
      "item_name": "temporary value",
      "uom_id": "<uuid>",
      "replenishment_type": "BD",
      "status": "ACTIVE",
      "variants": []
    }
  ]
}
```

atau melalui `common_values` untuk equalize:

```json
{
  "item_parent_id": "<uuid>",
  "common_values": {
    "replenishment_type": "RG",
    "status": "ACTIVE"
  },
  "items": []
}
```

## 7. List / Detail Item

Item response sekarang menggunakan:

```json
{
  "replenishment_type": "BD",
  "status": "ACTIVE"
}
```

Filter list yang relevan:

```text
?status=ACTIVE
?status=INACTIVE
?status=DISCONTINUE
?replenishment_type=RG
?replenishment_type=SS
?replenishment_type=BD
?replenishment_type=NR
```

Untuk parent status pada item list gunakan `parent_status`, bukan `status`.

## 8. Export Item

Endpoint tetap:

```http
GET /api/item-data/export/items
```

Filter status:

```text
tanpa status          -> semua
?status=ACTIVE        -> ACTIVE
?status=INACTIVE      -> INACTIVE
?status=DISCONTINUE   -> DISCONTINUE
```

Default columns Item sekarang mencakup:

```text
Business Unit
Channel Name
Category
Parent ID
Parent Name
SKU ID
SKU Type
Replenishment Type
SKU Name
Status
```

`Replenishment Type` diexport dalam raw code `RG/SS/BD/NR` supaya bisa digunakan kembali pada import.

## 9. Import Regular Item

Template `regular-item-import-template.xlsx` memiliki header:

```text
SKU ID
SKU Name
Parent ID
UOM Code
Replenishment Type
Qty/Pack
Height
Width
Depth
Gross Weight/Pack
Lead Time
Variant Attribute Value
Status
```

`Replenishment Type`:

```text
RG
SS
BD
NR
kosong
```

`Status`:

```text
ACTIVE
INACTIVE
DISCONTINUE
```

Literal `NULL` pada Replenishment Type akan clear menjadi `null` saat update.

Setelah import commit, backend regenerate SKU Name regular menggunakan Parent + BD modifier (jika BD) + Variant.

## 10. Import Bundle

Bundle tidak memiliki Replenishment Type.

Status Bundle mengikuti enum Item karena Bundle juga disimpan pada tabel `items`:

```text
ACTIVE
INACTIVE
DISCONTINUE
```

UOM Bundle tetap otomatis memakai UOM code `SET`.

## 11. Activity Log

Perubahan status Item tetap dicatat sebagai:

```text
action      = STATUS_CHANGE
entity_type = items
entity_id   = item UUID
```

`SKU Status Date` pada export tetap menggunakan latest `STATUS_CHANGE` untuk item tersebut.

## 12. Deployment dependency

Backend baru membutuhkan migration MariaDB sebelum service direstart:

```text
backend/database/migrations/20260916_items_replenishment_status.sql
```

BigQuery raw mapping juga berubah dari `is_active BOOL` menjadi `status STRING` dan menambahkan `replenishment_type STRING`.

SQL helper disediakan di:

```text
backend/database/bigquery/20260916_raw_items_replenishment_status.sql
```

Jika ada BigQuery View / Scheduled Query yang masih membaca `raw_items.is_active`, ubah consumer tersebut ke `raw_items.status` sebelum legacy column dihapus dari sisi BigQuery.
