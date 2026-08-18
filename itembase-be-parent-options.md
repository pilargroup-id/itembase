# Item Parent Dropdown Options & Item Config API Guide

Dokumentasi ini menjelaskan endpoint baru untuk kebutuhan dropdown Item Parent di frontend agar halaman create/edit Item tidak perlu memuat seluruh data Parent beserta relasinya.

## Tujuan Perubahan

Endpoint lama:

```http
GET /api/item/item-parents
```

tetap digunakan untuk halaman master/list Parent.

Untuk dropdown Parent pada form Item, gunakan endpoint ringan:

```http
GET /api/item/item-parents/options
```

Setelah Parent dipilih dan frontend membutuhkan konfigurasi lengkapnya, gunakan:

```http
GET /api/item/item-parents/:id/item-config
```

Dengan flow ini, frontend tidak perlu memuat seluruh Parent sekaligus.

---

## Authentication

Semua endpoint membutuhkan:

```http
Authorization: Bearer <token>
```

User juga harus memiliki akses ke aplikasi:

```text
itembase
```

---

# 1. Get Item Parent Options

Mengambil daftar Parent versi ringan untuk dropdown, autocomplete, atau infinite scroll.

## Endpoint

```http
GET /api/item/item-parents/options
```

## Query Parameters

| Parameter | Tipe | Wajib | Default | Keterangan |
|---|---|---:|---:|---|
| `page` | number | Tidak | `1` | Halaman data |
| `limit` | number | Tidak | `20` | Jumlah data per halaman |
| `search` | string | Tidak | - | Pencarian berdasarkan parent code, parent name, atau item name |
| `status` | string | Tidak | - | Filter status Parent, misalnya `active` |
| `selected_id` | UUID | Tidak | - | Memastikan Parent yang sedang dipilih tetap muncul saat edit |

## Contoh Request Awal

```http
GET /api/item/item-parents/options?page=1&limit=20&status=active
```

## Contoh Search

```http
GET /api/item/item-parents/options?page=1&limit=20&status=active&search=GOSAVE
```

## Contoh Saat Edit Item

```http
GET /api/item/item-parents/options?page=1&limit=20&status=active&selected_id=5f2c2d10-0000-4000-8000-000000000001
```

`selected_id` digunakan supaya Parent yang sedang terpasang pada Item tetap masuk ke hasil dropdown walaupun status Parent tersebut sudah bukan `active`.

## Contoh Response

```json
{
  "success": true,
  "message": "Item parent options retrieved successfully",
  "data": [
    {
      "id": "5f2c2d10-0000-4000-8000-000000000001",
      "parent_code": "P002031",
      "parent_name": "GOSAVE LATEX GLOVES",
      "item_name": "GOSAVE LATEX GLOVES",
      "status": "active",
      "label": "P002031 - GOSAVE LATEX GLOVES"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2031,
    "totalPages": 102
  }
}
```

## Field yang Direkomendasikan untuk Dropdown

Gunakan:

```text
value = id
label = label
```

Contoh object hasil mapping:

```js
const options = response.data.data.map((parent) => ({
  value: parent.id,
  label: parent.label,
  parentCode: parent.parent_code,
  parentName: parent.parent_name,
  status: parent.status,
}))
```

---

# 2. Get Item Parent Config

Mengambil konfigurasi Parent setelah user memilih salah satu Parent.

## Endpoint

```http
GET /api/item/item-parents/:id/item-config
```

## Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---:|---|
| `id` | UUID | Ya | ID Parent yang dipilih |

## Contoh Request

```http
GET /api/item/item-parents/5f2c2d10-0000-4000-8000-000000000001/item-config
```

## Contoh Response

```json
{
  "success": true,
  "message": "Item parent config retrieved successfully",
  "data": {
    "id": "5f2c2d10-0000-4000-8000-000000000001",
    "parent_code": "P002031",
    "parent_name": "GOSAVE LATEX GLOVES",
    "item_name": "GOSAVE LATEX GLOVES",
    "status": "active",
    "brand": {
      "id": "brand-uuid",
      "code": "GOSAVE",
      "name": "GOSAVE"
    },
    "category": {
      "id": "category-uuid",
      "detail_category": "LATEX GLOVES",
      "sub_category": "GLOVES",
      "main_category": "SAFETY",
      "brand_category": "GOSAVE"
    },
    "item_type": {
      "id": "item-type-uuid",
      "code": "IMPORT",
      "name": "Import"
    },
    "ports": [
      {
        "id": "port-uuid",
        "code": "CNSHA",
        "name": "Shanghai",
        "country_code": "CN",
        "is_primary": 1,
        "sort_order": 1
      }
    ],
    "variant_attributes": [
      {
        "id": "attribute-uuid",
        "code": "COLOR",
        "name": "Color",
        "sort_order": 1,
        "is_active": 1
      },
      {
        "id": "attribute-uuid-2",
        "code": "SIZE",
        "name": "Size",
        "sort_order": 2,
        "is_active": 1
      }
    ]
  }
}
```

## Penggunaan di FE

Endpoint ini dipanggil setelah dropdown Parent berubah.

Contoh:

```js
async function handleParentChange(parentId) {
  setSelectedParentId(parentId)

  if (!parentId) {
    setParentConfig(null)
    return
  }

  const response = await api.get(
    `/api/item/item-parents/${parentId}/item-config`
  )

  setParentConfig(response.data.data)
}
```

Data `variant_attributes` dapat digunakan untuk menentukan field Variant yang harus ditampilkan pada form Item.

Contoh:

```js
const variantFields = parentConfig?.variant_attributes ?? []
```

---

# 3. Rekomendasi Flow Frontend

## Create Item

```text
Halaman dibuka
→ GET /item-parents/options?page=1&limit=20&status=active
→ User mengetik pada dropdown
→ Request ulang dengan parameter search
→ User memilih Parent
→ GET /item-parents/:id/item-config
→ Tampilkan konfigurasi Parent dan Variant
```

## Edit Item

```text
Ambil detail Item
→ Simpan parent.id sebagai selected_id
→ GET /item-parents/options?status=active&selected_id=<current-parent-id>
→ Parent lama tetap muncul pada dropdown
→ GET /item-parents/:id/item-config
```

---

# 4. Debounce Search

Gunakan debounce sekitar `300–500 ms` agar frontend tidak mengirim request pada setiap karakter secara langsung.

Contoh sederhana:

```js
useEffect(() => {
  const timer = setTimeout(() => {
    fetchParentOptions({
      page: 1,
      limit: 20,
      search,
      status: 'active',
    })
  }, 400)

  return () => clearTimeout(timer)
}, [search])
```

---

# 5. Infinite Scroll / Load More

Gunakan metadata:

```json
{
  "page": 1,
  "limit": 20,
  "total": 2031,
  "totalPages": 102
}
```

Saat user mencapai bagian bawah dropdown:

```js
if (currentPage < totalPages) {
  fetchParentOptions({
    page: currentPage + 1,
    limit: 20,
    search,
    status: 'active',
  })
}
```

Gabungkan data baru dengan data sebelumnya dan cegah duplikat berdasarkan `id`.

---

# 6. Error Response

## Parent Tidak Ditemukan

```json
{
  "success": false,
  "message": "Item parent not found"
}
```

Status:

```http
404 Not Found
```

## Token Tidak Valid atau Kedaluwarsa

```json
{
  "success": false,
  "message": "Unauthorized: invalid token",
  "code": "TOKEN_INVALID"
}
```

atau:

```json
{
  "success": false,
  "message": "Unauthorized: token expired",
  "code": "TOKEN_EXPIRED"
}
```

Status:

```http
401 Unauthorized
```

## Tidak Memiliki Akses Itembase

```json
{
  "success": false,
  "message": "Forbidden: access to itembase is not allowed",
  "code": "APP_FORBIDDEN"
}
```

Status:

```http
403 Forbidden
```

---

# 7. Endpoint Lama Tetap Digunakan

Endpoint berikut tidak dihapus:

```http
GET /api/item/item-parents
GET /api/item/item-parents/:id
```

Penggunaannya:

| Endpoint | Penggunaan |
|---|---|
| `GET /api/item/item-parents` | Halaman master/list Parent |
| `GET /api/item/item-parents/:id` | Detail Parent lengkap |
| `GET /api/item/item-parents/options` | Dropdown/autocomplete Parent |
| `GET /api/item/item-parents/:id/item-config` | Konfigurasi Parent untuk create/edit Item |

---

# 8. Checklist Implementasi FE

- Ganti sumber dropdown Parent dari endpoint list utama ke endpoint `/options`.
- Gunakan pagination dan server-side search.
- Tambahkan debounce search.
- Gunakan `id` sebagai value dropdown.
- Gunakan `label` sebagai teks dropdown.
- Saat edit, kirim `selected_id`.
- Setelah Parent dipilih, panggil endpoint `/item-config`.
- Gunakan `variant_attributes` untuk membentuk field Variant.
- Jangan load seluruh Parent pada awal halaman.
- Tangani loading, empty result, pagination, dan error state.
