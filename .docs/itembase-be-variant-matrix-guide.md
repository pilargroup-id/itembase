# Itembase FE Integration Guide — Item Variant Matrix

Dokumentasi ini menjelaskan perubahan API backend untuk fitur **Item Variant Matrix**.

Fitur ini memungkinkan satu Item Parent memiliki beberapa atribut variant, kemudian frontend dapat membuat banyak SKU dari kombinasi nilai variant.

Contoh:

- Color: Red, Blue
- Size: M, L

Hasil matrix:

- Red / M
- Red / L
- Blue / M
- Blue / L

---

## 1. Authentication

Semua endpoint di dokumentasi ini membutuhkan authentication Itembase.

Gunakan token login Pilar Group seperti endpoint Itembase lainnya.

```http
Authorization: Bearer <token>
```

Base URL development melalui Vite proxy:

```text
/api
```

---

## 2. Konsep Data

Variant dibagi menjadi dua level.

### Variant Attribute

Jenis variant yang digunakan.

Seed awal:

| Code | Name |
|---|---|
| `COLOR` | Color |
| `MODEL` | Model |
| `SIZE` | Size |

### Variant Value

Nilai yang dimiliki sebuah attribute.

Contoh:

| Attribute | Code | Name |
|---|---|---|
| Color | `RED` | Red |
| Color | `BLUE` | Blue |
| Size | `M` | M |
| Size | `L` | L |

Backend otomatis membentuk `code` dari `name` jika frontend tidak mengirim `code`.

Contoh:

```text
Dark Blue -> DARK_BLUE
Extra Large -> EXTRA_LARGE
```

---

# 3. Master Variant Attribute

Base endpoint:

```text
/api/master/variants/attributes
```

## 3.1 List Variant Attributes

```http
GET /api/master/variants/attributes
```

Query parameter opsional:

| Parameter | Tipe | Keterangan |
|---|---:|---|
| `search` | string | Cari berdasarkan code atau name |
| `is_active` | `0` atau `1` | Filter status |

Contoh:

```http
GET /api/master/variants/attributes?is_active=1
```

Contoh response:

```json
{
  "success": true,
  "message": "Variant attributes retrieved successfully",
  "data": [
    {
      "id": "attribute-uuid",
      "code": "COLOR",
      "name": "Color",
      "is_active": 1,
      "created_at": "2026-07-27T00:00:00.000Z",
      "updated_at": "2026-07-27T00:00:00.000Z"
    }
  ]
}
```

## 3.2 Detail Variant Attribute

```http
GET /api/master/variants/attributes/:id
```

## 3.3 Create Variant Attribute

```http
POST /api/master/variants/attributes
```

Body yang direkomendasikan:

```json
{
  "name": "Material",
  "is_active": 1
}
```

`code` bersifat opsional karena backend dapat membuatnya dari `name`.

Body lengkap:

```json
{
  "code": "MATERIAL",
  "name": "Material",
  "is_active": 1
}
```

Validasi:

- `name` wajib diisi.
- `code` maksimal 30 karakter.
- `name` maksimal 100 karakter.
- `is_active` hanya menerima `0` atau `1`.
- Jika `code` kosong, backend menggunakan hasil normalisasi `name`.

## 3.4 Update Variant Attribute

```http
PUT /api/master/variants/attributes/:id
```

Body:

```json
{
  "name": "Product Material",
  "is_active": 1
}
```

> Endpoint `PUT` membutuhkan data lengkap yang ingin disimpan. Jangan kirim hanya satu field jika field lain tidak ingin dikosongkan.

## 3.5 Update Status Variant Attribute

```http
PATCH /api/master/variants/attributes/:id/status
```

Body:

```json
{
  "is_active": 0
}
```

## 3.6 Delete Variant Attribute

```http
DELETE /api/master/variants/attributes/:id
```

Attribute tidak dapat dihapus jika sudah digunakan oleh:

- variant value;
- item parent;
- item.

Backend akan mengembalikan status `409` jika data sudah digunakan.

---

# 4. Master Variant Value

Base endpoint:

```text
/api/master/variants/values
```

## 4.1 List Variant Values

```http
GET /api/master/variants/values
```

Query parameter opsional:

| Parameter | Tipe | Keterangan |
|---|---:|---|
| `search` | string | Cari value atau attribute |
| `attribute_id` | UUID | Filter berdasarkan attribute |
| `is_active` | `0` atau `1` | Filter status |

Contoh untuk mengambil seluruh warna aktif:

```http
GET /api/master/variants/values?attribute_id=<color_attribute_id>&is_active=1
```

Contoh response:

```json
{
  "success": true,
  "message": "Variant values retrieved successfully",
  "data": [
    {
      "id": "value-uuid",
      "attribute_id": "attribute-uuid",
      "attribute_code": "COLOR",
      "attribute_name": "Color",
      "code": "RED",
      "name": "Red",
      "sort_order": 1,
      "is_active": 1,
      "created_at": "2026-07-27T00:00:00.000Z",
      "updated_at": "2026-07-27T00:00:00.000Z"
    }
  ]
}
```

## 4.2 Detail Variant Value

```http
GET /api/master/variants/values/:id
```

## 4.3 Create Variant Value

```http
POST /api/master/variants/values
```

Body yang direkomendasikan:

```json
{
  "attribute_id": "attribute-uuid",
  "name": "Dark Blue",
  "sort_order": 1,
  "is_active": 1
}
```

Backend otomatis menghasilkan:

```text
DARK_BLUE
```

Body lengkap:

```json
{
  "attribute_id": "attribute-uuid",
  "code": "DARK_BLUE",
  "name": "Dark Blue",
  "sort_order": 1,
  "is_active": 1
}
```

Validasi:

- `attribute_id` wajib diisi.
- `name` wajib diisi.
- `code` maksimal 50 karakter.
- `name` maksimal 150 karakter.
- `sort_order` harus integer positif.
- `is_active` hanya menerima `0` atau `1`.

## 4.4 Update Variant Value

```http
PUT /api/master/variants/values/:id
```

Body:

```json
{
  "attribute_id": "attribute-uuid",
  "name": "Navy Blue",
  "sort_order": 2,
  "is_active": 1
}
```

## 4.5 Update Status Variant Value

```http
PATCH /api/master/variants/values/:id/status
```

Body:

```json
{
  "is_active": 0
}
```

## 4.6 Delete Variant Value

```http
DELETE /api/master/variants/values/:id
```

Value tidak dapat dihapus jika sudah digunakan oleh item.

---

# 5. Perubahan Item Parent

Endpoint Item Parent tetap menggunakan endpoint sebelumnya:

```text
/api/item/item-parents
```

Perubahannya adalah body create/update sekarang dapat menerima attribute variant.

## 5.1 Body Create Item Parent

Tambahkan field:

```json
{
  "variant_attributes": [
    {
      "attribute_id": "color-attribute-uuid",
      "sort_order": 1
    },
    {
      "attribute_id": "size-attribute-uuid",
      "sort_order": 2
    }
  ]
}
```

Contoh body create yang lebih lengkap:

```json
{
  "brand_id": "brand-uuid",
  "subbrand_id": "subbrand-uuid",
  "sub_brand": "GOSAVE PRO",
  "item_name": "LATEX GLOVES",
  "category_id": "category-uuid",
  "item_type_id": "item-type-uuid",
  "parent_name": "GOSAVE PRO LATEX GLOVES",
  "status": "active",
  "ports": [
    {
      "port_id": "port-uuid",
      "is_primary": 1,
      "sort_order": 1
    }
  ],
  "variant_attributes": [
    {
      "attribute_id": "color-attribute-uuid",
      "sort_order": 1
    },
    {
      "attribute_id": "size-attribute-uuid",
      "sort_order": 2
    }
  ]
}
```

Frontend juga boleh menggunakan format singkat:

```json
{
  "variant_attribute_ids": [
    "color-attribute-uuid",
    "size-attribute-uuid"
  ]
}
```

Gunakan salah satu format saja.

## 5.2 Response Item Parent

Response parent sekarang memiliki:

```json
{
  "variant_attributes": [
    {
      "id": "color-attribute-uuid",
      "code": "COLOR",
      "name": "Color",
      "is_active": 1,
      "sort_order": 1
    },
    {
      "id": "size-attribute-uuid",
      "code": "SIZE",
      "name": "Size",
      "is_active": 1,
      "sort_order": 2
    }
  ]
}
```

Urutan attribute pada form dan matrix sebaiknya mengikuti `sort_order`.

## 5.3 Update Item Parent

```http
PUT /api/item/item-parents/:id
```

Untuk mengganti variant attribute:

```json
{
  "variant_attributes": [
    {
      "attribute_id": "color-attribute-uuid",
      "sort_order": 1
    },
    {
      "attribute_id": "model-attribute-uuid",
      "sort_order": 2
    },
    {
      "attribute_id": "size-attribute-uuid",
      "sort_order": 3
    }
  ]
}
```

### Aturan penting

Variant attribute parent tidak dapat diubah jika parent tersebut sudah memiliki item dan daftar attribute yang dikirim berbeda dari sebelumnya.

Contoh error:

```json
{
  "success": false,
  "message": "Variant attributes cannot be changed because this parent already has items",
  "errors": {
    "variant_attributes": "Move or update the existing items before changing parent variant attributes"
  }
}
```

Karena itu, frontend sebaiknya menonaktifkan edit variant attribute ketika parent sudah memiliki SKU.

---

# 6. Perubahan Create Item Manual

Endpoint tetap:

```http
POST /api/item/items
```

Tambahkan field `variants` untuk item regular.

Contoh body:

```json
{
  "item_kind": "regular",
  "parent_id": "parent-uuid",
  "item_name": "GOSAVE PRO LATEX GLOVES RED L",
  "selling_name": "Gosave Pro Latex Gloves Red L",
  "uom_id": "uom-uuid",
  "qty_per_pack": 100,
  "height": 33,
  "width": 31,
  "depth": 10,
  "gross_weight_pack": 12,
  "production_time_days": 30,
  "is_active": 1,
  "variants": [
    {
      "attribute_id": "color-attribute-uuid",
      "value_id": "red-value-uuid"
    },
    {
      "attribute_id": "size-attribute-uuid",
      "value_id": "large-value-uuid"
    }
  ]
}
```

Format alternatif yang juga diterima backend:

```json
{
  "variants": [
    {
      "attribute": {
        "id": "color-attribute-uuid"
      },
      "value": {
        "id": "red-value-uuid"
      }
    }
  ]
}
```

Untuk FE, gunakan format utama `attribute_id` dan `value_id` agar payload lebih sederhana.

## 6.1 Aturan Variant Item

- Variant hanya boleh dipakai untuk `item_kind: "regular"`.
- Bundle tidak boleh memiliki variant.
- Setiap attribute hanya boleh muncul satu kali.
- Semua attribute yang dikonfigurasi pada parent wajib memiliki value.
- Value harus berasal dari attribute yang sesuai.
- Attribute dan value harus aktif.
- Kombinasi variant tidak boleh duplikat dalam parent yang sama.

Contoh:

Parent menggunakan:

```text
COLOR + SIZE
```

Maka item wajib mengirim:

```text
1 COLOR + 1 SIZE
```

Tidak valid:

- hanya mengirim Color;
- mengirim dua Color;
- mengirim Model yang tidak dikonfigurasi pada parent;
- memilih value Size untuk attribute Color.

## 6.2 Duplicate Combination

Jika kombinasi sudah ada:

```json
{
  "success": false,
  "message": "Variant combination already exists on item 682600000001",
  "errors": null
}
```

HTTP status:

```text
409 Conflict
```

---

# 7. Perubahan Update Item

```http
PUT /api/item/items/:id
```

Untuk mengubah variant:

```json
{
  "item_kind": "regular",
  "parent_id": "parent-uuid",
  "item_name": "GOSAVE PRO LATEX GLOVES BLUE L",
  "selling_name": "Gosave Pro Latex Gloves Blue L",
  "variants": [
    {
      "attribute_id": "color-attribute-uuid",
      "value_id": "blue-value-uuid"
    },
    {
      "attribute_id": "size-attribute-uuid",
      "value_id": "large-value-uuid"
    }
  ]
}
```

Catatan:

- Jika `variants` dikirim, backend mengganti seluruh relasi variant item.
- Jika `variants` tidak dikirim, variant lama dipertahankan selama parent tidak berubah.
- Jika `parent_id` berubah, frontend sebaiknya mengirim ulang `variants` yang sesuai dengan parent baru.
- `item_kind` tidak dapat diubah setelah item dibuat.

---

# 8. Perubahan Response Item

Endpoint list dan detail item sekarang menampilkan dua field tambahan:

```json
{
  "variants": [
    {
      "attribute": {
        "id": "color-attribute-uuid",
        "code": "COLOR",
        "name": "Color"
      },
      "value": {
        "id": "red-value-uuid",
        "code": "RED",
        "name": "Red"
      }
    },
    {
      "attribute": {
        "id": "size-attribute-uuid",
        "code": "SIZE",
        "name": "Size"
      },
      "value": {
        "id": "large-value-uuid",
        "code": "L",
        "name": "L"
      }
    }
  ],
  "variant_summary": "Red / L"
}
```

Gunakan:

- `variant_summary` untuk tabel list item;
- `variants` untuk detail dan edit form.

---

# 9. Preview Variant Matrix

Endpoint ini hanya membuat kombinasi untuk ditampilkan di UI. Endpoint tidak menyimpan data.

```http
POST /api/item/items/matrix/preview
```

## 9.1 Request Body

```json
{
  "item_parent_id": "parent-uuid",
  "attributes": [
    {
      "attribute_id": "color-attribute-uuid",
      "value_ids": [
        "red-value-uuid",
        "blue-value-uuid"
      ]
    },
    {
      "attribute_id": "size-attribute-uuid",
      "value_ids": [
        "medium-value-uuid",
        "large-value-uuid"
      ]
    }
  ]
}
```

Backend juga menerima `parent_id`, tetapi FE disarankan menggunakan `item_parent_id` agar lebih jelas.

## 9.2 Aturan Request

- Semua attribute parent harus dikirim.
- Attribute tidak boleh duplikat.
- Setiap attribute minimal memiliki satu value.
- `value_ids` yang duplikat otomatis dibersihkan oleh backend.
- Semua value harus aktif dan sesuai dengan attribute.

## 9.3 Response

```json
{
  "success": true,
  "message": "Item matrix preview generated successfully",
  "data": {
    "item_parent_id": "parent-uuid",
    "total_combinations": 4,
    "combinations": [
      {
        "row_no": 1,
        "variant_summary": "Red / M",
        "suggested_item_name": "GOSAVE PRO LATEX GLOVES RED M",
        "suggested_selling_name": "GOSAVE PRO LATEX GLOVES Red M",
        "variants": [
          {
            "attribute_id": "color-attribute-uuid",
            "value_id": "red-value-uuid",
            "attribute_code": "COLOR",
            "attribute_name": "Color",
            "value_code": "RED",
            "value_name": "Red"
          },
          {
            "attribute_id": "size-attribute-uuid",
            "value_id": "medium-value-uuid",
            "attribute_code": "SIZE",
            "attribute_name": "Size",
            "value_code": "M",
            "value_name": "M"
          }
        ]
      }
    ]
  }
}
```

Frontend dapat memakai hasil preview sebagai baris awal matrix, lalu user boleh:

- mengubah `item_name`;
- mengubah `selling_name`;
- menghapus kombinasi yang tidak ingin dibuat;
- mengisi field item lainnya per baris.

---

# 10. Create Items from Matrix

Endpoint ini menyimpan seluruh item matrix dalam satu transaction.

```http
POST /api/item/items/matrix
```

Jika satu baris gagal, seluruh proses dibatalkan dan tidak ada item yang tersimpan.

Maksimal:

```text
250 items per request
```

## 10.1 Request Body

```json
{
  "item_parent_id": "parent-uuid",
  "common_values": {
    "uom_id": "uom-uuid",
    "qty_per_pack": 100,
    "height": 33,
    "width": 31,
    "depth": 10,
    "gross_weight_pack": 12,
    "production_time_days": 30,
    "is_active": 1
  },
  "items": [
    {
      "item_name": "GOSAVE PRO LATEX GLOVES RED M",
      "selling_name": "Gosave Pro Latex Gloves Red M",
      "variants": [
        {
          "attribute_id": "color-attribute-uuid",
          "value_id": "red-value-uuid"
        },
        {
          "attribute_id": "size-attribute-uuid",
          "value_id": "medium-value-uuid"
        }
      ]
    },
    {
      "item_name": "GOSAVE PRO LATEX GLOVES RED L",
      "selling_name": "Gosave Pro Latex Gloves Red L",
      "qty_per_pack": 50,
      "variants": [
        {
          "attribute_id": "color-attribute-uuid",
          "value_id": "red-value-uuid"
        },
        {
          "attribute_id": "size-attribute-uuid",
          "value_id": "large-value-uuid"
        }
      ]
    }
  ]
}
```

## 10.2 Common Values dan Override Per Baris

Nilai dari `common_values` digunakan untuk semua item.

Field pada baris `items[]` akan meng-override `common_values`.

Contoh:

```json
{
  "common_values": {
    "qty_per_pack": 100
  },
  "items": [
    {
      "qty_per_pack": 50
    }
  ]
}
```

Nilai akhir baris tersebut adalah:

```text
qty_per_pack = 50
```

Backend otomatis menetapkan:

```json
{
  "parent_id": "berasal dari item_parent_id",
  "item_kind": "regular"
}
```

Frontend tidak perlu mengirim kedua field tersebut di setiap baris.

## 10.3 Response

```json
{
  "success": true,
  "message": "Item matrix created successfully",
  "data": {
    "total_created": 2,
    "items": [
      {
        "id": "item-uuid",
        "item_code": "682600000001",
        "barcode": "682600000001",
        "item_name": "GOSAVE PRO LATEX GLOVES RED M",
        "selling_name": "Gosave Pro Latex Gloves Red M",
        "variant_summary": "Red / M",
        "variants": []
      }
    ]
  }
}
```

`item_code` dan `barcode` dibuat otomatis oleh backend. Jangan kirim field tersebut dari frontend.

---

# 11. Rekomendasi Flow Frontend

## Create Item Parent

1. Load attribute aktif:

```http
GET /api/master/variants/attributes?is_active=1
```

2. Tampilkan pilihan:

- Color
- Model
- Size

3. Kirim pilihan pada `variant_attributes` ketika create parent.

## Create Item Matrix

1. User memilih Item Parent.
2. Ambil detail parent.
3. Baca `parent.variant_attributes`.
4. Untuk setiap attribute, load value aktif:

```http
GET /api/master/variants/values?attribute_id=<attribute_id>&is_active=1
```

5. Tampilkan multi-select value.
6. Kirim pilihan ke endpoint preview.
7. Tampilkan `data.combinations` sebagai tabel.
8. Izinkan user mengubah data per baris.
9. Kirim baris final ke endpoint create matrix.

Contoh kolom matrix:

| Create | Color | Model | Size | Item Name | Selling Name | UOM | Qty/Pack |
|---|---|---|---|---|---|---|---:|
| ✓ | Red | Basic | M | ... | ... | Pair | 100 |
| ✓ | Red | Basic | L | ... | ... | Pair | 100 |

## Create Single Item

1. Pilih parent.
2. Baca `variant_attributes` parent.
3. Tampilkan satu select value untuk setiap attribute.
4. Kirim pilihan pada field `variants`.

---

# 12. Error Handling

## Validation Error

HTTP status:

```text
400 atau 422
```

Format umum:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "selling_name": "Selling name is required"
  }
}
```

## Duplicate Variant Combination

HTTP status:

```text
409
```

```json
{
  "success": false,
  "message": "Variant combination already exists on item 682600000001"
}
```

## Master Data In Use

HTTP status:

```text
409
```

```json
{
  "success": false,
  "message": "Variant value is already in use"
}
```

## Parent Not Found

HTTP status:

```text
404
```

```json
{
  "success": false,
  "message": "Parent item not found"
}
```

---

# 13. Ringkasan Endpoint Baru

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/master/variants/attributes` | List attribute |
| `GET` | `/api/master/variants/attributes/:id` | Detail attribute |
| `POST` | `/api/master/variants/attributes` | Create attribute |
| `PUT` | `/api/master/variants/attributes/:id` | Update attribute |
| `PATCH` | `/api/master/variants/attributes/:id/status` | Update status attribute |
| `DELETE` | `/api/master/variants/attributes/:id` | Delete attribute |
| `GET` | `/api/master/variants/values` | List value |
| `GET` | `/api/master/variants/values/:id` | Detail value |
| `POST` | `/api/master/variants/values` | Create value |
| `PUT` | `/api/master/variants/values/:id` | Update value |
| `PATCH` | `/api/master/variants/values/:id/status` | Update status value |
| `DELETE` | `/api/master/variants/values/:id` | Delete value |
| `POST` | `/api/item/items/matrix/preview` | Preview kombinasi |
| `POST` | `/api/item/items/matrix` | Bulk create item matrix |

---

# 14. Ringkasan Endpoint Existing yang Berubah

| Endpoint | Perubahan |
|---|---|
| `POST /api/item/item-parents` | Menerima `variant_attributes` atau `variant_attribute_ids` |
| `PUT /api/item/item-parents/:id` | Dapat memperbarui variant attribute sebelum parent memiliki item |
| `GET /api/item/item-parents` | Response parent memiliki `variant_attributes` |
| `GET /api/item/item-parents/:id` | Response parent memiliki `variant_attributes` |
| `POST /api/item/items` | Menerima `variants` untuk regular item |
| `PUT /api/item/items/:id` | Dapat mengganti seluruh `variants` item |
| `GET /api/item/items` | Response memiliki `variants` dan `variant_summary` |
| `GET /api/item/items/:id` | Response memiliki `variants` dan `variant_summary` |

---

# 15. Checklist Implementasi FE

- [ ] Buat API service untuk Variant Attribute.
- [ ] Buat API service untuk Variant Value.
- [ ] Tambahkan pilihan variant attribute pada form Item Parent.
- [ ] Tampilkan variant attribute dari response Item Parent.
- [ ] Tambahkan field variant pada create/edit Item regular.
- [ ] Jangan tampilkan variant untuk Bundle.
- [ ] Buat multi-select value untuk matrix.
- [ ] Integrasikan endpoint matrix preview.
- [ ] Buat tabel hasil kombinasi.
- [ ] Izinkan override field per baris.
- [ ] Integrasikan endpoint bulk create matrix.
- [ ] Tampilkan `variant_summary` pada list item.
- [ ] Tangani error `409` untuk duplicate combination.
- [ ] Jangan kirim `item_code` dan `barcode`.
- [ ] Gunakan `attribute_id` dan `value_id` sebagai value form, bukan code/name.
