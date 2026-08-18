# ItemBase FE Guide — Export, Template, dan Bulk Import

## Ringkasan

Modul export dan bulk import sekarang dipisahkan dari CRUD utama Item menjadi modul **Item Data**.

Base URL:

```text
/api/item-data
```

Semua endpoint membutuhkan:

```http
Authorization: Bearer <token>
```

User juga harus mempunyai akses aplikasi `itembase`.

---

## 1. Export data

### Parent

```http
GET /api/item-data/exports/parents
```

### Regular Item

```http
GET /api/item-data/exports/items
```

### Bundle

```http
GET /api/item-data/exports/bundles
```

Response berupa file `.xlsx`.

Export Bundle mempunyai dua sheet:

- `Bundles`
- `Bundle Components`

Endpoint lama berikut sudah tidak digunakan:

```http
GET /api/item/download
```

---

## 2. Download template import

### Parent

```http
GET /api/item-data/templates/parents
```

### Regular Item

```http
GET /api/item-data/templates/items
```

### Bundle

```http
GET /api/item-data/templates/bundles
```

Setiap template membawa reference sheet terbaru dari database, antara lain:

- Brands
- Categories
- Item Types
- UOMs
- Ports
- Variant Attributes
- Variant Values
- Parents
- Items

User mengisi code yang mudah dibaca, bukan UUID.

---

## 3. Header template

### Parent — sheet `Parents`

```text
parent_code
brand_code
subbrand_name
item_name
category_detail
item_type_code
parent_name
status
ports
variant_attributes
```

Mandatory saat **CREATE**:

```text
parent_code
brand_code
subbrand_name
item_name
category_detail
item_type_code
parent_name
```

Saat **UPDATE**, hanya `parent_code` yang wajib. Kolom lain bersifat patch.

Contoh update brand saja:

| parent_code | brand_code |
|---|---|
| P002034 | GOTO_BARU |

### Regular Item — sheet `Items`

```text
item_code
item_name
selling_name
parent_code
uom_code
qty_per_pack
height
width
depth
gross_weight_pack
production_time_days
is_active
variants
```

Mandatory saat **CREATE**:

```text
item_code
item_name
parent_code
uom_code
```

`s​​elling_name` tidak wajib. Jika kosong saat create, backend menyalin `item_name`.

### Bundle — sheet `Bundles`

```text
item_code
selling_name
parent_code
uom_code
is_active
```

`item_name` tidak dikirim karena dibuat otomatis dari komponennya.

### Bundle — sheet `Bundle Components`

```text
bundle_item_code
component_item_code
qty
sort_order
```

Aturan Bundle:

- minimal 1 component;
- maksimal 5 component;
- jika Bundle hanya memiliki 1 component, `qty` component harus lebih dari 1;
- jika Bundle memiliki lebih dari 1 component, masing-masing `qty` boleh mulai dari 1;
- component wajib Regular Item;
- Bundle tidak boleh menjadi component;
- `item_name` Bundle dibuat otomatis.

---

## 4. Format value khusus

### Multiple ports

```text
CNSHK;CNNGB;CNSHA
```

### Variant attributes pada Parent

```text
COLOR;MODEL;SIZE
```

### Variant values pada Item

```text
COLOR=RED;MODEL=BASIC;SIZE=L
```

### Update kosong dan clear field

- Kolom tidak ada atau cell kosong: nilai lama tidak berubah.
- Cell berisi `NULL`: backend mencoba mengosongkan field.
- Field wajib/`NOT NULL` tidak dapat di-clear.

---

## 5. Preview import

Request menggunakan `multipart/form-data`.

Nama field file:

```text
file
```

### Parent

```http
POST /api/item-data/imports/parents/preview
```

### Regular Item

```http
POST /api/item-data/imports/items/preview
```

### Bundle

```http
POST /api/item-data/imports/bundles/preview
```

Contoh response:

```json
{
  "success": true,
  "message": "Import preview generated",
  "data": {
    "preview_token": "f3616c25-...",
    "expires_at": "2026-07-29T06:00:00.000Z",
    "summary": {
      "total": 100,
      "valid": 90,
      "invalid": 10
    },
    "rows": [
      {
        "source_row": 2,
        "action": "UPDATE",
        "status": "VALID",
        "errors": [],
        "original": {
          "parent_code": "P002034",
          "brand_code": "GOTO_BARU"
        }
      }
    ]
  }
}
```

Preview belum mengubah database. Token berlaku selama **60 menit**.

FE disarankan menampilkan:

- jumlah total;
- jumlah valid;
- jumlah invalid;
- action `CREATE` atau `UPDATE`;
- nomor baris Excel;
- alasan invalid.

---

## 6. Commit import

```http
POST /api/item-data/imports/commit
Content-Type: application/json
```

Body:

```json
{
  "preview_token": "f3616c25-..."
}
```

Backend hanya mencoba commit row yang valid. Setiap row menggunakan transaction sendiri, sehingga kegagalan satu row tidak me-rollback row lain.

Contoh response:

```json
{
  "success": true,
  "message": "Import committed",
  "data": {
    "summary": {
      "total": 100,
      "success": 90,
      "failed": 10
    },
    "successes": [],
    "error_file_token": "35c496d9-..."
  }
}
```

Jika `error_file_token` tidak `null`, FE harus langsung men-download file error.

```http
GET /api/item-data/imports/errors/:errorFileToken
```

File error mempunyai kolom tambahan:

```text
_source_row
_import_action
_import_status
_error_code
_error_message
```

Contoh flow FE setelah commit:

```js
const result = await commitImport(previewToken)

if (result.data.error_file_token) {
  await downloadImportErrors(result.data.error_file_token)
}
```

---

## 7. Cancel preview

```http
DELETE /api/item-data/imports/preview/:previewToken
```

Cancel menghapus file preview sementara dan tidak mengubah database.

---

## 8. Penentuan CREATE atau UPDATE

### Parent

Pivot:

```text
parent_code
```

- ditemukan di database → `UPDATE`;
- tidak ditemukan → `CREATE`.

Format:

```text
P + 6 digit
```

Contoh valid:

```text
P002034
```

Parent baru boleh melompati sequence, tetapi tidak boleh lebih kecil atau sama dengan parent code terbesar yang sudah ada.

### Item dan Bundle

Pivot:

```text
item_code
```

- ditemukan di database → `UPDATE`, termasuk code tahun lama;
- tidak ditemukan → `CREATE` dan wajib memakai prefix tahun berjalan.

Format item code:

```text
68 + YY + 8 digit sequence
```

Contoh pada tahun 2026:

```text
682600002352
```

Saat create melalui import:

```text
barcode = item_code
```

Saat update, barcode lama tidak diubah.

---

## 9. Catatan UI

- Tombol **Commit** aktif setelah preview selesai.
- Tombol **Cancel** memanggil endpoint cancel.
- FE tidak perlu mengirim ulang file ketika commit.
- Jangan simpan UUID di template buatan FE.
- Gunakan template dari backend supaya reference selalu terbaru.
- Untuk label `production_time_days`, FE tetap boleh menampilkan **Lead Time Days**.
