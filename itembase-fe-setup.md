# ItemBase Frontend API Documentation

Dokumentasi ini dibuat untuk developer frontend yang akan consume API ItemBase.

Isi utama:
- setup koneksi development ke database GCP via SSH tunnel
- daftar endpoint ItemBase
- method endpoint
- body endpoint kalau ada
- cara akses endpoint internal PilarGroup yang tidak memakai Bearer token

---

# 1. Base URL

## Local Development

```txt
http://localhost:3000/api
```

## Production

```txt
https://itembase.pilargroup.id/api
```

Contoh `.env` frontend:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

# 2. Header ItemBase API

Semua endpoint ItemBase menggunakan Bearer token.

```txt
Authorization: Bearer <TOKEN_LOGIN_ITEMBASE>
Content-Type: application/json
Accept: application/json
```

Contoh fetch:

```js
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/master/brands`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  },
});
```

---

# 3. Database Connection Overview

Backend ItemBase connect ke 2 database:

```txt
itembase   = database utama ItemBase
pilargroup = central database PilarGroup
```

Di backend, koneksi database dipisah:

```js
const { db, centralDb } = require('../../config/database.config');
```

`db` dipakai untuk table ItemBase:

```txt
master_brands
master_pics
master_pic_users
master_categories
master_item_types
master_ports
master_uoms
master_sku_statuses
item_parents
items
item_channels
item_bundle_components
```

`centralDb` dipakai untuk data dari PilarGroup:

```txt
central_users
master_business_units
master_business_unit_departments
master_departments
```

Frontend tidak connect langsung ke database. Frontend hanya hit API backend.

---

# 4. Backend `.env` Local Example

Jika backend lokal connect ke database GCP via SSH tunnel:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=<ITEMBASE_DB_USER>
DB_PASSWORD=<ITEMBASE_DB_PASSWORD>
DB_NAME=itembase

CENTRAL_DB_HOST=127.0.0.1
CENTRAL_DB_PORT=3307
CENTRAL_DB_USER=<PILARGROUP_DB_USER>
CENTRAL_DB_PASSWORD=<PILARGROUP_DB_PASSWORD>
CENTRAL_DB_NAME=pilargroup
```

---

# 5. Frontend `.env` Local Example

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Untuk endpoint internal PilarGroup, jangan simpan `INTERNAL_SYNC_SECRET` di frontend production.

---

# 6. SSH Tunnel Development

Jika central DB berada di server dan tidak bisa diakses langsung dari lokal, gunakan SSH tunnel.

Setiap developer wajib punya SSH key masing-masing. Jangan share private key.

Generate SSH key lokal:

```bash
ssh-keygen -t ed25519 -C "itembase-local-<nama-kamu>"
```

Lihat public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Pindah ke terminal VM

Tambahkan public key ke server atau chat Azi:

```bash
nano ~/.ssh/authorized_keys
```da

Permission di server:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R azi:azi ~/.ssh
```

Test login dari laptop lokal:

```bash
ssh -i ~/.ssh/id_ed25519 azi@ssh.pilargroup.id
```

Kalau berhasil, keluar:

```bash
exit
```

Aktifkan tunnel dari laptop lokal, bukan dari dalam server:

```bash
ssh -i ~/.ssh/id_ed25519 -N -L 3307:127.0.0.1:3306 azi@ssh.pilargroup.id
```

Terminal tunnel harus tetap terbuka selama backend berjalan.

Backend `.env` saat pakai tunnel:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=<ITEMBASE_DB_USER>
DB_PASSWORD=<ITEMBASE_DB_PASSWORD>
DB_NAME=itembase

CENTRAL_DB_HOST=127.0.0.1
CENTRAL_DB_PORT=3307
CENTRAL_DB_USER=<PILARGROUP_DB_USER>
CENTRAL_DB_PASSWORD=<PILARGROUP_DB_PASSWORD>
CENTRAL_DB_NAME=pilargroup
```

Test koneksi database:

```bash
mysql -h 127.0.0.1 -P 3307 -u <DB_USER> -p
```

Expected database:

```txt
itembase
pilargroup
```

---

# 7. Endpoint Internal PilarGroup

Endpoint internal PilarGroup tidak memakai Bearer token.

Header yang dipakai:

```txt
X-Internal-Secret: <INTERNAL_SYNC_SECRET>
Accept: application/json
```

Base URL:

```txt
https://pilargroup.id/api/internal
```

## 7.1 Get Business Units

```txt
GET /directory/business-units?active=1
```

Full URL:

```txt
GET https://pilargroup.id/api/internal/directory/business-units?active=1
```

Header:

```txt
X-Internal-Secret: <INTERNAL_SYNC_SECRET>
Accept: application/json
```

Contoh response:

```json
{
  "message": "Business units fetched successfully",
  "data": [
    {
      "id": "bu-gosave-0001",
      "code": "GOSAVE",
      "name": "GOSAVE",
      "is_active": 1
    },
    {
      "id": "bu-goto-0001",
      "code": "GOTO",
      "name": "GOTO",
      "is_active": 1
    }
  ]
}
```

## 7.2 Get Departments by Business Unit

```txt
GET /directory/business-units/:business_unit_id/departments?active=1
```

Full URL example:

```txt
GET https://pilargroup.id/api/internal/directory/business-units/bu-goto-0001/departments?active=1
```

Header:

```txt
X-Internal-Secret: <INTERNAL_SYNC_SECRET>
Accept: application/json
```

Contoh response:

```json
{
  "message": "Departments fetched successfully",
  "data": [
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "department_code": "GTE",
      "department_name": "GOTO E-Commerce",
      "is_primary": 1
    },
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 19,
      "department_code": "GTG",
      "department_name": "GOTO GT",
      "is_primary": 0
    },
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 15,
      "department_code": "STO",
      "department_name": "GOTO Store",
      "is_primary": 0
    }
  ]
}
```

## 7.3 Important Note

Jangan expose `INTERNAL_SYNC_SECRET` ke frontend production.

Recommended flow:

```txt
Frontend -> ItemBase Backend -> PilarGroup Internal API
```

Bukan:

```txt
Frontend -> PilarGroup Internal API langsung dengan X-Internal-Secret
```

---

# 8. ItemBase Endpoint List

## 8.1 Master Brands

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/brands` | No |
| GET | `/master/brands/:id` | No |
| POST | `/master/brands` | Yes |
| PUT | `/master/brands/:id` | Yes |
| DELETE | `/master/brands/:id` | No |

Body POST/PUT:

```json
{
  "code": "GOTO",
  "name": "GOTO",
  "is_active": 1
}
```

Query params:

```txt
search
is_active
```

---

## 8.2 Master PICs

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/pics` | No |
| GET | `/master/pics/:id` | No |
| POST | `/master/pics` | Yes |
| PUT | `/master/pics/:id` | Yes |
| DELETE | `/master/pics/:id` | No |

Body POST/PUT:

```json
{
  "code": "PRODUCT",
  "name": "Product",
  "is_active": 1
}
```

Query params:

```txt
search
is_active
```

---

## 8.3 Master Categories

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/categories` | No |
| GET | `/master/categories/:id` | No |
| POST | `/master/categories` | Yes |
| PUT | `/master/categories/:id` | Yes |
| DELETE | `/master/categories/:id` | No |

Body POST/PUT:

```json
{
  "detail_category": "Backpack Kids",
  "sub_category": "Backpack",
  "main_category": "Bag",
  "brand_category": "Kids Bag",
  "pic_id": "ISI_PIC_ID_VALID",
  "is_active": 1
}
```

`pic_id` boleh `null`.

Query params:

```txt
search
pic_id
main_category
sub_category
brand_category
is_active
```

---

## 8.4 Master Item Types

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/item-types` | No |
| GET | `/master/item-types/:id` | No |
| POST | `/master/item-types` | Yes |
| PUT | `/master/item-types/:id` | Yes |
| DELETE | `/master/item-types/:id` | No |

Body POST/PUT:

```json
{
  "code": "FG",
  "name": "Finished Goods",
  "is_active": 1
}
```

Query params:

```txt
search
is_active
```

---

## 8.5 Master Ports

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/ports` | No |
| GET | `/master/ports/:id` | No |
| POST | `/master/ports` | Yes |
| PUT | `/master/ports/:id` | Yes |
| DELETE | `/master/ports/:id` | No |

Body POST/PUT:

```json
{
  "code": "JKT",
  "name": "Jakarta",
  "is_active": 1
}
```

Query params:

```txt
search
is_active
```

---

## 8.6 Master UOMs

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/uoms` | No |
| GET | `/master/uoms/:id` | No |
| POST | `/master/uoms` | Yes |
| PUT | `/master/uoms/:id` | Yes |
| DELETE | `/master/uoms/:id` | No |

Body POST/PUT:

```json
{
  "code": "PCS",
  "name": "Pieces",
  "is_active": 1
}
```

Query params:

```txt
search
is_active
```

---

## 8.7 Master SKU Statuses

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/sku-statuses` | No |
| GET | `/master/sku-statuses/:id` | No |
| POST | `/master/sku-statuses` | Yes |
| PUT | `/master/sku-statuses/:id` | Yes |
| DELETE | `/master/sku-statuses/:id` | No |

Body POST/PUT:

```json
{
  "code": "ACTIVE",
  "name": "Active",
  "is_active": 1
}
```

Query params:

```txt
search
is_active
```

---

## 8.8 Master PIC Users

| Method | Endpoint | Body |
|---|---|---|
| GET | `/master/pic-users` | No |
| GET | `/master/pic-users/options` | No |
| GET | `/master/pic-users/:id` | No |
| POST | `/master/pic-users` | Yes |
| PUT | `/master/pic-users/:pic_id` | Yes |
| DELETE | `/master/pic-users/:id` | No |

Body POST:

```json
{
  "pic_id": "ISI_PIC_ID_VALID",
  "users": [
    {
      "central_user_id": "ISI_CENTRAL_USER_ID_VALID_1",
      "is_primary": 1,
      "is_active": 1
    },
    {
      "central_user_id": "ISI_CENTRAL_USER_ID_VALID_2",
      "is_primary": 0,
      "is_active": 1
    }
  ]
}
```

Body PUT:

```json
{
  "users": [
    {
      "central_user_id": "ISI_CENTRAL_USER_ID_VALID_1",
      "is_primary": 1,
      "is_active": 1
    },
    {
      "central_user_id": "ISI_CENTRAL_USER_ID_VALID_2",
      "is_primary": 0,
      "is_active": 1
    }
  ]
}
```

Query params:

```txt
search
pic_id
central_user_id
is_primary
is_active
```

---

# 9. Item Endpoint List

## 9.1 Item Parents

| Method | Endpoint | Body |
|---|---|---|
| GET | `/item/item-parents` | No |
| GET | `/item/item-parents/:id` | No |
| POST | `/item/item-parents` | Yes |
| PUT | `/item/item-parents/:id` | Yes |

Body POST:

```json
{
  "brand_id": "ISI_BRAND_ID_VALID",
  "sub_brand": "FRUCI",
  "item_name": "BACKPACK KIDS",
  "category_id": "ISI_CATEGORY_ID_VALID",
  "item_type_id": "ISI_ITEM_TYPE_ID_VALID",
  "port_id": "ISI_PORT_ID_VALID",
  "parent_name": "GOTO FRUCI BACKPACK KIDS",
  "status": "active"
}
```

Body PUT:

```json
{
  "brand_id": "ISI_BRAND_ID_VALID",
  "sub_brand": "FRUCI UPDATED",
  "item_name": "BACKPACK KIDS UPDATED",
  "category_id": "ISI_CATEGORY_ID_VALID",
  "item_type_id": "ISI_ITEM_TYPE_ID_VALID",
  "port_id": "ISI_PORT_ID_VALID",
  "parent_name": "GOTO FRUCI BACKPACK KIDS UPDATED",
  "status": "active"
}
```

Body PUT inactive:

```json
{
  "status": "inactive"
}
```

Query params:

```txt
search
status
brand_id
category_id
item_type_id
port_id
```

Notes:

```txt
parent_code auto-generate dari backend.
Frontend jangan kirim parent_code.
```

---

## 9.2 Items

| Method | Endpoint | Body |
|---|---|---|
| GET | `/item/items` | No |
| GET | `/item/items/:id` | No |
| POST | `/item/items` | Yes |
| PUT | `/item/items/:id` | Yes |

Query params:

```txt
search
item_kind
parent_id
uom_id
sku_status_id
business_unit_id
department_id
is_active
status
brand_id
category_id
item_type_id
port_id
item_code
barcode
item_name
variant
qty_per_pack
height
width
depth
gross_weight_pack
container_20ft_qty
container_40hq_qty
production_time_days
channel_code
channel_name
channel_is_primary
channel_is_active
```

---

# 10. Item Body Examples

## 10.1 Create Regular Item

```json
{
  "item_kind": "regular",
  "item_name": "TEST GOTO BACKPACK RED",
  "parent_id": "ISI_PARENT_ID_VALID",
  "uom_id": "ISI_UOM_ID_VALID",
  "sku_status_id": "ISI_SKU_STATUS_ID_VALID",
  "business_unit_id": "bu-goto-0001",
  "variant": "RED",
  "qty_per_pack": 1,
  "height": 30,
  "width": 20,
  "depth": 10,
  "gross_weight_pack": 0.5,
  "container_20ft_qty": 1000,
  "container_40hq_qty": 2200,
  "production_time_days": 14,
  "is_active": 1,
  "channels": [
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "channel_code": "GTE",
      "channel_name": "GOTO E-Commerce",
      "is_primary": 1,
      "is_active": 1
    }
  ]
}
```

## 10.2 Update Regular Item

```json
{
  "item_name": "TEST GOTO BACKPACK RED UPDATED",
  "parent_id": "ISI_PARENT_ID_VALID",
  "uom_id": "ISI_UOM_ID_VALID",
  "sku_status_id": "ISI_SKU_STATUS_ID_VALID",
  "business_unit_id": "bu-goto-0001",
  "variant": "RED UPDATED",
  "qty_per_pack": 1,
  "height": 31,
  "width": 21,
  "depth": 11,
  "gross_weight_pack": 0.6,
  "container_20ft_qty": 1100,
  "container_40hq_qty": 2300,
  "production_time_days": 15,
  "is_active": 1,
  "channels": [
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "channel_code": "GTE",
      "channel_name": "GOTO E-Commerce",
      "is_primary": 1,
      "is_active": 1
    }
  ]
}
```

## 10.3 Create Bundle Item

```json
{
  "item_kind": "bundle",
  "parent_id": "ISI_PARENT_ID_VALID",
  "uom_id": "ISI_UOM_ID_VALID",
  "sku_status_id": "ISI_SKU_STATUS_ID_VALID",
  "business_unit_id": "bu-goto-0001",
  "variant": "BUNDLE TEST",
  "qty_per_pack": 1,
  "is_active": 1,
  "channels": [
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "channel_code": "GTE",
      "channel_name": "GOTO E-Commerce",
      "is_primary": 1,
      "is_active": 1
    }
  ],
  "components": [
    {
      "component_item_id": "REGULAR_ITEM_ID_1",
      "qty": 1,
      "sort_order": 1
    },
    {
      "component_item_id": "REGULAR_ITEM_ID_2",
      "qty": 1,
      "sort_order": 2
    }
  ]
}
```

## 10.4 Update Bundle Item

```json
{
  "parent_id": "ISI_PARENT_ID_VALID",
  "uom_id": "ISI_UOM_ID_VALID",
  "sku_status_id": "ISI_SKU_STATUS_ID_VALID",
  "business_unit_id": "bu-goto-0001",
  "variant": "BUNDLE TEST UPDATED",
  "qty_per_pack": 1,
  "is_active": 1,
  "channels": [
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "channel_code": "GTE",
      "channel_name": "GOTO E-Commerce",
      "is_primary": 1,
      "is_active": 1
    },
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 15,
      "channel_code": "STO",
      "channel_name": "GOTO Store",
      "is_primary": 0,
      "is_active": 1
    }
  ],
  "components": [
    {
      "component_item_id": "REGULAR_ITEM_ID_1",
      "qty": 2,
      "sort_order": 1
    },
    {
      "component_item_id": "REGULAR_ITEM_ID_2",
      "qty": 1,
      "sort_order": 2
    }
  ]
}
```

---

# 11. Dropdown Mapping for Frontend

## 11.1 Item Parent Form

```txt
GET /master/brands?is_active=1
GET /master/categories?is_active=1
GET /master/item-types?is_active=1
GET /master/ports?is_active=1
```

## 11.2 Item Form

```txt
GET /item/item-parents?status=active
GET /master/uoms?is_active=1
GET /master/sku-statuses?is_active=1
```

Business unit source:

```txt
GET https://pilargroup.id/api/internal/directory/business-units?active=1
```

Department source after business unit selected:

```txt
GET https://pilargroup.id/api/internal/directory/business-units/:business_unit_id/departments?active=1
```

Header PilarGroup internal endpoint:

```txt
X-Internal-Secret: <INTERNAL_SYNC_SECRET>
Accept: application/json
```

---

# 12. Important Frontend Rules

```txt
1. Jangan kirim parent_code.
2. Jangan kirim item_code.
3. Jangan kirim barcode.
4. item_kind hanya dikirim saat create item.
5. item_kind tidak boleh diubah setelah item dibuat.
6. Regular item wajib kirim item_name.
7. Bundle item_name digenerate backend dari components.
8. Bundle minimal 2 components.
9. Bundle maksimal 5 components.
10. Component item harus regular item, bukan bundle.
11. Channels dikirim bareng create/update item.
12. Item channels tidak punya endpoint CRUD terpisah.
13. Bundle components tidak punya endpoint CRUD terpisah.
14. business_unit_id berasal dari PilarGroup.
15. department_id berasal dari PilarGroup.
```

---

# 13. Common Error Response

Validation error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field_name": "Error message"
  }
}
```

Not found:

```json
{
  "success": false,
  "message": "Data not found"
}
```

Duplicate:

```json
{
  "success": false,
  "message": "Code already exists",
  "errors": {
    "code": "DUPLICATE_ENTRY",
    "field": "code",
    "constraint": "uq_xxx"
  }
}
```

Master data already used:

```json
{
  "success": false,
  "message": "Brand is already used by item parents"
}
```
