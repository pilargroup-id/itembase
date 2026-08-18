# FE Consume Guide - Item Export & Inactive Items

Dokumentasi ini mencakup perubahan endpoint export Item dan endpoint baru untuk list Item inactive.

## Ringkasan Perubahan

Endpoint export lama berdasarkan type:

```http
GET /api/item-data/exports/:type
```

sudah diganti menjadi satu endpoint:

```http
GET /api/item-data/export
```

Export sekarang selalu menghasilkan satu sheet Item dan dapat memilih status `active` atau `inactive`.

Endpoint baru untuk mengambil Item inactive dalam bentuk JSON:

```http
GET /api/item-data/inactive-items
```

Semua endpoint di bawah membutuhkan Bearer token dan akses aplikasi `itembase`.

---

# 1. Export Items

## Endpoint

```http
GET /api/item-data/export
```

## Query Parameters

| Parameter | Required | Default | Description |
|---|---:|---|---|
| `status` | No | `active` | `active` atau `inactive` |
| `fields` | No | kosong | Kolom optional yang ingin ditambahkan, dipisahkan koma |

Export **tidak memiliki filter tanggal**. Semua Item sesuai status yang dipilih akan diexport.

## Status

Default:

```http
GET /api/item-data/export
```

sama dengan:

```http
GET /api/item-data/export?status=active
```

Untuk Item inactive:

```http
GET /api/item-data/export?status=inactive
```

Value selain `active` dan `inactive` akan ditolak.

---

## Default Columns

Enam kolom berikut selalu ada dan tidak perlu dikirim melalui `fields`:

1. `Business Unit`
2. `Channel Name`
3. `Category`
4. `SKU`
5. `Parent Name`
6. `Item Name`

Mapping:

| Header XLSX | Source |
|---|---|
| Business Unit | Business Unit dari Brand Item |
| Channel Name | Channel aktif dari Brand Item |
| Category | `master_categories.detail_category` |
| SKU | `items.item_code` |
| Parent Name | `item_parents.parent_name` |
| Item Name | `items.item_name` |

Jika satu Item memiliki lebih dari satu Business Unit atau Channel, Item tetap hanya menghasilkan **satu row**.

Contoh:

```text
Business Unit = GOTO,GOSAVE
Channel Name  = E-Commerce,Store
```

Separator multiple value adalah koma tanpa membuat row baru.

---

## Optional Fields

FE dapat menampilkan checkbox berikut:

| Query Field | Header XLSX |
|---|---|
| `main_category` | Main Category |
| `sub_category` | Sub Category |
| `brand_category` | Brand Category |
| `pic` | PIC |
| `item_created_date` | Item Created Date |
| `item_updated_date` | Item Updated Date |
| `port` | Port |
| `item_source` | Item Source |
| `selling_name` | Selling Name |
| `uom` | UOM |
| `qty_per_pack` | Qty/Pack |
| `height` | Height |
| `width` | Width |
| `depth` | Depth |
| `gross_weight_pack` | Gross Weight/Pack |
| `lead_time` | Lead Time |

Contoh:

```http
GET /api/item-data/export?status=active&fields=main_category,sub_category,pic,item_created_date,port,uom
```

FE boleh mengirim urutan checkbox secara acak. Backend tetap menyusun kolom XLSX menggunakan urutan baku berikut:

1. Business Unit
2. Channel Name
3. Category
4. SKU
5. Parent Name
6. Item Name
7. Main Category
8. Sub Category
9. Brand Category
10. PIC
11. Item Created Date
12. Item Updated Date
13. Port
14. Item Source
15. Selling Name
16. UOM
17. Qty/Pack
18. Height
19. Width
20. Depth
21. Gross Weight/Pack
22. Lead Time

Hanya optional field yang dicentang yang ditambahkan, tetapi urutannya tetap mengikuti daftar di atas.

---

## Date Format di XLSX

Khusus:

```text
Item Created Date
Item Updated Date
```

format hasil Excel:

```text
YYYY-MM-DD
```

Contoh:

```text
2026-08-18
```

Jam tidak ikut diexport.

---

## Field Mapping Tambahan

| Header XLSX | Source |
|---|---|
| Main Category | `master_categories.main_category` |
| Sub Category | `master_categories.sub_category` |
| Brand Category | `master_categories.brand_category` |
| PIC | User pada `master_category_users`, di-resolve ke Pilar Group Directory |
| Item Created Date | `items.created_at` |
| Item Updated Date | `items.updated_at` |
| Port | Port pada `item_parent_ports` + `master_ports` |
| Item Source | `master_item_types.name` |
| Selling Name | `items.selling_name` |
| UOM | `master_uoms.name` |
| Qty/Pack | `items.qty_per_pack` |
| Height | `items.height` |
| Width | `items.width` |
| Depth | `items.depth` |
| Gross Weight/Pack | `items.gross_weight_pack` |
| Lead Time | `items.production_time_days` |

---

## FE Download Example

```js
async function downloadItemsExport({ status = 'active', fields = [] }) {
  const params = new URLSearchParams()
  params.set('status', status)

  if (fields.length) {
    params.set('fields', fields.join(','))
  }

  const response = await api.get(`/api/item-data/export?${params.toString()}`, {
    responseType: 'blob',
  })

  const blobUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = `items-${status}.xlsx`
  link.click()

  window.URL.revokeObjectURL(blobUrl)
}
```

Recommended UI flow:

```text
Export button
→ Select Status (default Active)
→ Select optional columns
→ Download
```

Tidak perlu date picker pada modal export.

---

# 2. Get Inactive Items

Endpoint ini digunakan untuk mendapatkan Item yang **saat ini inactive**.

## Endpoint

```http
GET /api/item-data/inactive-items
```

## Query Parameters

| Parameter | Required | Default | Description |
|---|---:|---|---|
| `page` | No | `1` | Pagination |
| `limit` | No | `20` | Maximum `250` |
| `search` | No | - | Search SKU, Item Name, Selling Name, Parent Code, atau Parent Name |
| `date_from` | No | - | Filter tanggal inactive mulai `YYYY-MM-DD` |
| `date_to` | No | - | Filter tanggal inactive sampai `YYYY-MM-DD` |

Saat ini FE tidak wajib menggunakan `date_from` dan `date_to`. Parameter disediakan untuk kebutuhan berikutnya.

Tanpa date range:

```http
GET /api/item-data/inactive-items?page=1&limit=20
```

Dengan date range:

```http
GET /api/item-data/inactive-items?date_from=2026-08-01&date_to=2026-08-31&page=1&limit=20
```

Hanya `date_from`:

```http
GET /api/item-data/inactive-items?date_from=2026-08-01
```

Hanya `date_to`:

```http
GET /api/item-data/inactive-items?date_to=2026-08-31
```

`date_from` tidak boleh lebih besar dari `date_to`.

---

## Inactive Date Logic

Item harus memenuhi:

```text
items.is_active = 0
```

Tanggal inactive berasal dari `activity_logs` dengan kondisi:

```text
entity_type = items
action = STATUS_CHANGE
after_data.is_active = 0
```

Jika Item pernah mengalami:

```text
Active → Inactive → Active → Inactive
```

`inactive_date` menggunakan transition ke inactive yang **paling terakhir**.

Item yang pernah inactive tetapi sekarang sudah active tidak ikut endpoint ini.

Jika terdapat Item inactive lama tetapi history `STATUS_CHANGE` tidak tersedia, Item tetap dapat muncul dan `inactive_date` dapat bernilai `null` selama tidak menggunakan filter tanggal.

---

## Example Response

```json
{
  "success": true,
  "message": "Inactive items retrieved successfully",
  "data": [
    {
      "id": "item-uuid",
      "item_code": "682600002352",
      "item_name": "GOSAVE LATEX GLOVES RED L",
      "selling_name": "Gosave Latex Gloves Red L",
      "item_kind": "regular",
      "is_active": 0,
      "status": "inactive",
      "inactive_date": "2026-08-18T03:20:14.000Z",
      "created_at": "2026-07-01T04:00:00.000Z",
      "updated_at": "2026-08-18T03:20:14.000Z",
      "parent": {
        "id": "parent-uuid",
        "parent_code": "P002031",
        "parent_name": "GOSAVE LATEX GLOVES"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Timestamp JSON mengikuti serialization backend. Untuk display FE, format sesuai kebutuhan UI.

---

# 3. Endpoint yang Tidak Berubah

Fitur template dan import tetap menggunakan endpoint sebelumnya:

```http
GET    /api/item-data/templates/:type
POST   /api/item-data/imports/:type/preview
POST   /api/item-data/imports/commit
DELETE /api/item-data/imports/preview/:token
GET    /api/item-data/imports/errors/:token
```

Type template/import tetap mengikuti implementasi yang sudah ada.

---

# 4. Endpoint Export Lama

Frontend jangan lagi menggunakan:

```http
GET /api/item-data/exports/parents
GET /api/item-data/exports/items
GET /api/item-data/exports/bundles
```

Gunakan satu endpoint:

```http
GET /api/item-data/export
```

---

# 5. Checklist FE

- Ganti seluruh consume export lama ke `GET /api/item-data/export`.
- Status export default `active`.
- Sediakan pilihan `Active` dan `Inactive`.
- Jangan tampilkan date filter pada modal Export.
- Enam default column tidak perlu checkbox.
- Tampilkan checkbox hanya untuk optional fields.
- Kirim optional checkbox melalui query `fields` dipisahkan koma.
- Jangan mengatur urutan kolom di FE; backend sudah menjamin urutan XLSX.
- Gunakan `responseType: 'blob'` saat download.
- Gunakan `GET /api/item-data/inactive-items` untuk list inactive Item.
- `date_from` dan `date_to` pada inactive-items bersifat optional dan belum wajib dipakai UI sekarang.
