# Itembase API Change Guide untuk Frontend

Dokumentasi ini menjelaskan perubahan endpoint dan payload setelah refactor database Itembase.

## Base URL dan autentikasi

Contoh local development:

```text
http://localhost:5173/api
```

Request dari frontend tetap memakai path relatif `/api/...` dan diteruskan oleh Vite proxy ke backend.

Semua endpoint di bawah tetap membutuhkan autentikasi dan akses aplikasi `itembase`.

---

# Ringkasan perubahan utama

1. Channel tidak lagi disimpan pada item.
2. Business unit tidak lagi disimpan langsung pada item.
3. Channel dan business unit sekarang dikelola melalui brand.
4. Port item parent sekarang berbentuk array karena satu parent dapat memiliki banyak port.
5. PIC kategori lama dihapus dan diganti menjadi array user kategori.
6. SKU status dihapus seluruhnya.
7. Item memiliki field baru `selling_name`.
8. Field container quantity dihapus dari item.
9. Master port sekarang memiliki `country_code`.

---

# 1. Item

## Endpoint

```http
GET    /api/item/items
GET    /api/item/items/:id
POST   /api/item/items
PUT    /api/item/items/:id
```

Endpoint tidak berubah, tetapi request body dan response berubah.

## Field yang dihapus dari item

Frontend tidak boleh lagi mengirim atau mengharapkan field berikut:

```text
sku_status_id
business_unit_id
channels
container_20ft_qty
container_40hq_qty
```

Response juga tidak lagi memiliki:

```text
sku_status
business_unit
channels
```

Business unit dan channel sekarang tersedia melalui:

```text
item.parent.brand.channels
```

## Field baru

```text
selling_name
```

`s​elling_name` wajib dikirim pada create item dan maksimal 255 karakter.

## Create regular item

```http
POST /api/item/items
Content-Type: application/json
```

```json
{
  "item_kind": "regular",
  "parent_id": "item-parent-uuid",
  "uom_id": "uom-uuid",
  "item_name": "GOTO Example Product Red",
  "selling_name": "GOTO Example Product",
  "variant": "Red",
  "qty_per_pack": 12,
  "height": 10.5,
  "width": 8,
  "depth": 6,
  "gross_weight_pack": 4.25,
  "production_time_days": 30,
  "is_active": 1
}
```

### Field wajib create regular

```text
item_kind
parent_id
item_name
selling_name
```

`item_code` dan `barcode` dibuat otomatis oleh backend dan tidak boleh dikirim.

## Create bundle item

```json
{
  "item_kind": "bundle",
  "parent_id": "item-parent-uuid",
  "uom_id": "uom-uuid",
  "selling_name": "Bundle Example",
  "components": [
    {
      "component_item_id": "regular-item-uuid-1",
      "qty": 2,
      "sort_order": 1
    },
    {
      "component_item_id": "regular-item-uuid-2",
      "qty": 1,
      "sort_order": 2
    }
  ],
  "is_active": 1
}
```

Catatan bundle:

- Minimal 2 komponen.
- Maksimal 5 komponen.
- Komponen harus item `regular`.
- `item_name` bundle dibuat otomatis oleh backend dari komponen.
- `selling_name` tetap wajib dikirim frontend.

## Update item

```http
PUT /api/item/items/:id
```

Update item mendukung field parsial. Kirim hanya field yang ingin diubah.

```json
{
  "selling_name": "Nama jual terbaru",
  "variant": "Black",
  "qty_per_pack": 24,
  "is_active": 1
}
```

`item_kind` tidak dapat diganti setelah item dibuat.

Untuk mengganti komponen bundle, kirim ulang seluruh array `components`:

```json
{
  "components": [
    {
      "component_item_id": "regular-item-uuid-1",
      "qty": 3,
      "sort_order": 1
    },
    {
      "component_item_id": "regular-item-uuid-2",
      "qty": 1,
      "sort_order": 2
    }
  ]
}
```

## Response item terbaru

Struktur penting:

```json
{
  "id": "item-uuid",
  "item_code": "682600000001",
  "barcode": "682600000001",
  "item_name": "GOTO Example Product Red",
  "selling_name": "GOTO Example Product",
  "item_kind": "regular",
  "variant": "Red",
  "qty_per_pack": "12.00",
  "height": "10.50",
  "width": "8.00",
  "depth": "6.00",
  "gross_weight_pack": "4.25",
  "production_time_days": "30.00",
  "is_active": 1,
  "parent": {
    "id": "parent-uuid",
    "parent_code": "P002031",
    "parent_name": "TR ATHENA JAS HUJAN",
    "status": "active",
    "brand": {
      "id": "brand-uuid",
      "code": "GOTO",
      "name": "GOTO",
      "channels": [
        {
          "id": "brand-channel-uuid",
          "business_unit_id": "bu-goto-0001",
          "department_id": 3,
          "channel_name": "GOTO E-Commerce",
          "channel_code": "GTE",
          "is_primary": 1,
          "is_active": 1,
          "business_unit": {
            "id": "bu-goto-0001",
            "code": "GOTO",
            "name": "GOTO"
          },
          "department": {
            "id": 3,
            "code": "GTE",
            "name": "GOTO E-Commerce"
          }
        }
      ]
    },
    "category": {
      "id": "category-uuid",
      "detail_category": "Example",
      "sub_category": "Example",
      "main_category": "Example",
      "brand_category": "Example",
      "users": []
    },
    "item_type": null,
    "ports": []
  },
  "uom": {
    "id": "uom-uuid",
    "code": "PCS",
    "name": "Pieces"
  },
  "components": []
}
```

## Filter item yang berubah

Endpoint:

```http
GET /api/item/items
```

Filter lama yang dihapus:

```text
sku_status_id
container_20ft_qty
container_40hq_qty
channel_is_primary
channel_is_active
```

Filter yang masih tersedia:

```text
page
limit
sort
search
item_kind
parent_id
uom_id
is_active
status
brand_id
category_id
item_type_id
port_id
item_code
barcode
item_name
selling_name
variant
qty_per_pack
height
width
depth
gross_weight_pack
production_time_days
business_unit_id
department_id
channel_code
channel_name
```

Walaupun `business_unit_id` dan channel sudah tidak berada pada item, filter tersebut tetap tersedia dan membaca relasi channel dari brand.

Sort tambahan:

```text
selling-name-asc
selling-name-desc
```

---

# 2. Item Parent dan Multi Port

## Endpoint

```http
GET    /api/item/item-parents
GET    /api/item/item-parents/:id
POST   /api/item/item-parents
PUT    /api/item/item-parents/:id
GET    /api/item/item-parents/helpers/subbrands
```

Endpoint tidak berubah.

## Perubahan body

Field lama berikut dihapus:

```text
port_id
```

Diganti dengan array:

```text
ports
```

## Create item parent

```json
{
  "subbrand_id": "subbrand-uuid",
  "brand_id": "brand-uuid",
  "sub_brand": "ATHENA",
  "item_name": "JAS HUJAN",
  "category_id": "category-uuid",
  "item_type_id": "item-type-uuid",
  "parent_name": "TR ATHENA JAS HUJAN",
  "status": "active",
  "ports": [
    {
      "port_id": "port-uuid-1",
      "is_primary": 1,
      "sort_order": 1
    },
    {
      "port_id": "port-uuid-2",
      "is_primary": 0,
      "sort_order": 2
    }
  ]
}
```

Backend juga menerima format ringkas berikut:

```json
{
  "port_ids": [
    "port-uuid-1",
    "port-uuid-2"
  ]
}
```

Namun untuk frontend disarankan konsisten memakai `ports` agar dapat mengatur `is_primary` dan `sort_order`.

Jika tidak ada port:

```json
{
  "ports": []
}
```

## Update item parent

Untuk mengganti daftar port, kirim ulang seluruh array `ports`:

```json
{
  "ports": [
    {
      "port_id": "port-uuid-3",
      "is_primary": 1,
      "sort_order": 1
    }
  ]
}
```

Jika `ports` dan `port_ids` tidak dikirim pada update, daftar port lama dipertahankan.

## Response item parent terbaru

```json
{
  "id": "parent-uuid",
  "parent_code": "P002031",
  "parent_name": "TR ATHENA JAS HUJAN",
  "status": "active",
  "brand": {
    "id": "brand-uuid",
    "code": "TR",
    "name": "TR"
  },
  "category": {
    "id": "category-uuid",
    "detail_category": "Example",
    "sub_category": "Example",
    "main_category": "Example",
    "brand_category": "Example"
  },
  "item_type": {
    "id": "item-type-uuid",
    "code": "IMPORT",
    "name": "Import"
  },
  "ports": [
    {
      "id": "port-uuid",
      "country_code": "CN",
      "code": "CNNBG",
      "name": "Ningbo Pt",
      "is_primary": 1,
      "sort_order": 1
    }
  ]
}
```

Frontend harus mengganti penggunaan:

```text
parent.port
```

menjadi:

```text
parent.ports
```

---

# 3. Brand dan Multi Business Unit/Channel

## Endpoint

```http
GET    /api/master/brands
GET    /api/master/brands/:id
POST   /api/master/brands
PUT    /api/master/brands/:id
PATCH  /api/master/brands/:id/status
DELETE /api/master/brands/:id
```

Endpoint tidak berubah.

## Body baru brand

Brand sekarang mengelola business unit dan channel melalui array `channels`.

```json
{
  "code": "GOTO",
  "name": "GOTO",
  "is_active": 1,
  "channels": [
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "channel_name": "GOTO E-Commerce",
      "channel_code": "GTE",
      "is_primary": 1,
      "is_active": 1
    },
    {
      "business_unit_id": "bu-goto-0001",
      "department_id": 15,
      "channel_name": "GOTO Store",
      "channel_code": "STO",
      "is_primary": 0,
      "is_active": 1
    }
  ]
}
```

## Ketentuan channel brand

- Satu brand dapat memiliki banyak business unit.
- Satu brand dapat memiliki banyak channel.
- Kombinasi `business_unit_id + department_id` tidak boleh duplikat dalam brand yang sama.
- Maksimal satu channel memiliki `is_primary = 1` per brand.
- Jika semua `is_primary` bernilai `0`, backend otomatis menjadikan channel pertama sebagai primary.
- Department harus terdaftar dan aktif pada business unit yang dipilih.

## Update brand

`PUT /api/master/brands/:id` tetap membutuhkan data utama brand:

```json
{
  "code": "GOTO",
  "name": "GOTO",
  "is_active": 1,
  "channels": []
}
```

Perhatian: saat field `channels` dikirim, backend mengganti seluruh relasi channel brand. Frontend harus mengirim semua channel yang masih ingin dipertahankan.

Jika `channels` tidak dikirim, backend mempertahankan relasi channel sebelumnya.

## Response brand terbaru

```json
{
  "id": "brand-uuid",
  "code": "GOTO",
  "name": "GOTO",
  "is_active": 1,
  "channels": [
    {
      "id": "brand-channel-uuid",
      "brand_id": "brand-uuid",
      "business_unit_id": "bu-goto-0001",
      "department_id": 3,
      "channel_name": "GOTO E-Commerce",
      "channel_code": "GTE",
      "is_primary": 1,
      "is_active": 1,
      "business_unit": {
        "id": "bu-goto-0001",
        "code": "GOTO",
        "name": "GOTO"
      },
      "department": {
        "id": 3,
        "code": "GTE",
        "name": "GOTO E-Commerce"
      }
    }
  ]
}
```

---

# 4. Category dan Multi User/PIC

## Endpoint

```http
GET    /api/master/categories
GET    /api/master/categories/:id
POST   /api/master/categories
PUT    /api/master/categories/:id
PATCH  /api/master/categories/:id/status
DELETE /api/master/categories/:id
```

Endpoint category tidak berubah.

## Field lama yang dihapus

Frontend tidak boleh lagi mengirim atau membaca:

```text
pic_id
pic_code
pic_name
```

Diganti dengan:

```text
users
```

## Create/update category

```json
{
  "detail_category": "Safety Gloves",
  "sub_category": "Personal Protective Equipment",
  "main_category": "Safety",
  "brand_category": "Industrial",
  "is_active": 1,
  "users": [
    {
      "central_user_id": "central-user-uuid-1",
      "is_primary": 1,
      "is_active": 1
    },
    {
      "central_user_id": "central-user-uuid-2",
      "is_primary": 0,
      "is_active": 1
    }
  ]
}
```

## Ketentuan user kategori

- `users` harus berupa array.
- `central_user_id` tidak boleh duplikat dalam satu kategori.
- Maksimal satu user primary.
- Jika semua user non-primary, backend otomatis menjadikan user pertama sebagai primary.
- User harus ditemukan pada internal directory Pilar Group.

Saat `users` dikirim pada update, backend mengganti seluruh relasi user kategori. Frontend harus mengirim semua user yang masih ingin dipertahankan.

Jika `users` tidak dikirim, backend mempertahankan relasi user sebelumnya.

## Response category terbaru

```json
{
  "id": "category-uuid",
  "detail_category": "Safety Gloves",
  "sub_category": "Personal Protective Equipment",
  "main_category": "Safety",
  "brand_category": "Industrial",
  "is_active": 1,
  "users": [
    {
      "id": "category-user-relation-uuid",
      "category_id": "category-uuid",
      "central_user_id": "central-user-uuid",
      "is_primary": 1,
      "is_active": 1,
      "user": {
        "id": "central-user-uuid",
        "name": "User Name",
        "username": "username"
      }
    }
  ]
}
```

Filter category berubah:

Field lama:

```text
pic_id
```

Diganti menjadi:

```text
central_user_id
```

Contoh:

```http
GET /api/master/categories?central_user_id=central-user-uuid
```

---

# 5. Master Port

## Endpoint

```http
GET    /api/master/ports
GET    /api/master/ports/:id
POST   /api/master/ports
PUT    /api/master/ports/:id
PATCH  /api/master/ports/:id/status
DELETE /api/master/ports/:id
```

Endpoint tidak berubah.

## Body baru

Field baru yang wajib:

```text
country_code
```

```json
{
  "country_code": "CN",
  "code": "CNNBG",
  "name": "Ningbo Pt",
  "is_active": 1
}
```

Ketentuan:

- `country_code` wajib tepat 2 huruf.
- Backend mengubah `country_code` dan `code` menjadi uppercase.
- Maksimal nama port 150 karakter.

Filter tambahan:

```http
GET /api/master/ports?country_code=CN
```

Response:

```json
{
  "id": "port-uuid",
  "country_code": "CN",
  "code": "CNNBG",
  "name": "Ningbo Pt",
  "is_active": 1
}
```

---

# 6. Endpoint yang dihapus

Seluruh endpoint berikut sudah tidak tersedia dan harus dihapus dari pemanggilan frontend.

## PIC

```http
/api/master/pics
/api/master/pics/:id
/api/master/pics/:id/status
```

## PIC User

```http
/api/master/pic-users
/api/master/pic-users/options
/api/master/pic-users/:id
/api/master/pic-users/:pic_id
/api/master/pic-users/:id/status
```

PIC kategori sekarang dikelola langsung melalui field `users` pada endpoint category.

## SKU Status

```http
/api/master/sku-statuses
/api/master/sku-statuses/:id
/api/master/sku-statuses/:id/status
```

Frontend harus menghapus:

- dropdown SKU status;
- filter SKU status;
- field `sku_status_id` pada form item;
- render `sku_status` pada detail/list item.

---

# 7. Endpoint yang tidak berubah

Endpoint berikut tetap dipakai seperti sebelumnya:

```http
/api/master/item-types
/api/master/uoms
/api/directory/*
/api/auth/me
/api/activity-logs
```

---

# 8. Checklist perubahan frontend

- Hapus field item `sku_status_id`.
- Hapus field item `business_unit_id`.
- Hapus editor channel dari form item.
- Hapus `container_20ft_qty` dan `container_40hq_qty`.
- Tambahkan field wajib `selling_name`.
- Ambil channel item dari `item.parent.brand.channels`.
- Ubah single port parent menjadi multi-select `ports`.
- Ganti pembacaan `parent.port` menjadi `parent.ports`.
- Tambahkan editor multi-BU/multi-channel pada form brand.
- Hapus modul master PIC dan PIC User.
- Tambahkan multi-select user langsung pada form category.
- Ganti filter category `pic_id` menjadi `central_user_id`.
- Tambahkan `country_code` pada form dan filter port.
- Hapus seluruh konsumsi endpoint SKU Status.

---

# 9. Standard response

Success:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {}
}
```

Paginated:

```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 1
  }
}
```

Validation error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "selling_name": "Selling name is required"
  }
}
```
