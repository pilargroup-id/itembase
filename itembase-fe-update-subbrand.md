# ItemBase - Dokumentasi FE Consume Update Item Parents & Subbrand Similarity

## 1. Summary

Pada modul `item_parents`, terdapat update backend untuk mendukung fitur subbrand similarity seperti yang sebelumnya ada di Google Sheet.

Fitur ini digunakan saat user mengisi field **Sub Brand** di form Register Parent / Item Parent. Backend akan memberikan suggestion berdasarkan data historis dari `master_subbrands` dan `master_subbrand_items`, lengkap dengan score similarity.

Perubahan utama:

- `item_parents.brand_id` sekarang boleh `NULL`.
- `item_parents.item_name` sekarang boleh `NULL`.
- `item_parents.subbrand_id` digunakan sebagai relasi ke `master_subbrands`.
- `item_parents.sub_brand` tetap digunakan sebagai snapshot text.
- Backend otomatis melakukan resolve/create subbrand saat create/update item parent.
- Backend otomatis sync data helper ke `master_subbrand_items`.
- Backend menyediakan endpoint similarity suggestion untuk FE.

---

## 2. Tabel yang Terlibat

### 2.1 `item_parents`

Tabel utama untuk parent item.

Field penting yang berubah:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `subbrand_id` | `char(36)` | No | Relasi ke `master_subbrands.id` |
| `brand_id` | `varchar(36)` | No | Sekarang boleh `NULL` |
| `sub_brand` | `varchar(100)` | No | Snapshot text subbrand |
| `item_name` | `varchar(255)` | No | Sekarang boleh `NULL` |
| `category_id` | `varchar(36)` | Yes | Wajib |
| `parent_name` | `varchar(255)` | Yes | Wajib |
| `status` | `enum` | Yes | Default `active` saat create |

---

### 2.2 `master_subbrands`

Tabel master subbrand.

| Field | Notes |
|---|---|
| `id` | UUID subbrand |
| `name` | Nama subbrand |
| `normalized_name` | Nama subbrand versi normalized/lowercase |
| `is_active` | Status aktif |

---

### 2.3 `master_subbrand_items`

Tabel helper untuk similarity suggestion.

| Field | Notes |
|---|---|
| `id` | UUID |
| `subbrand_id` | Relasi ke `master_subbrands.id` |
| `item_parent_id` | Relasi ke `item_parents.id` |
| `item_name` | Reference parent name |
| `normalized_item_name` | Reference parent name versi normalized |
| `is_active` | Status aktif |

Tabel ini menjadi pengganti sheet helper di Google Sheet.

---

## 3. Endpoint Similarity Subbrand

Endpoint ini digunakan FE untuk menampilkan tabel similarity saat user mengetik field **Sub Brand**.

### URL

```http
GET /api/item/item-parents/helpers/subbrands
```

### Query Params

| Param | Required | Default | Notes |
|---|---:|---:|---|
| `input` | Yes | - | Text subbrand yang sedang diketik user |
| `limit` | No | `50` | Jumlah maksimal data yang dikembalikan |
| `min_score` | No | `35` | Minimal score yang ditampilkan |

### Example Request

```bash
curl "http://localhost:3000/api/item/item-parents/helpers/subbrands?input=FOCA&limit=30"
```

### Example Response

```json
{
  "success": true,
  "message": "Subbrand suggestions retrieved successfully",
  "data": [
    {
      "subbrand_id": "e8216f61-79ae-11f1-b653-a0ad9f5456d0",
      "sub_brand": "ORCA",
      "parent_name": "GOTO ORCA SHOWER",
      "score": 75
    },
    {
      "subbrand_id": "e81437f2-79ae-11f1-b653-a0ad9f5456d0",
      "sub_brand": "BOSCA",
      "parent_name": "KOVA BODY SCALE BOSCA",
      "score": 60
    }
  ]
}
```

---

## 4. Behavior Similarity di FE

Flow yang disarankan:

```text
User mengetik Sub Brand
↓
FE debounce 300ms
↓
FE call endpoint helper
↓
BE return suggestion + score
↓
FE render table similarity
```

Kolom tabel similarity:

| Column UI | Source dari API |
|---|---|
| Sub Brand | `sub_brand` |
| Parent Name | `parent_name` |
| Score | `score` |

---

## 5. Recommended FE Behavior

### 5.1 Saat input kosong

Jika field Sub Brand kosong, FE tidak perlu hit endpoint.

Expected UI:

```text
Table similarity kosong
```

---

### 5.2 Saat user mengetik

Contoh user mengetik:

```text
FOCA
```

FE call:

```http
GET /api/item/item-parents/helpers/subbrands?input=FOCA&limit=30
```

FE render response ke tabel.

---

### 5.3 Saat user klik suggestion

Jika user klik row suggestion, FE harus set:

```js
form.subbrand_id = selected.subbrand_id;
form.sub_brand = selected.sub_brand;
```

Contoh selected row:

```json
{
  "subbrand_id": "e8216f61-79ae-11f1-b653-a0ad9f5456d0",
  "sub_brand": "ORCA",
  "parent_name": "GOTO ORCA SHOWER",
  "score": 75
}
```

Maka form menjadi:

```json
{
  "subbrand_id": "e8216f61-79ae-11f1-b653-a0ad9f5456d0",
  "sub_brand": "ORCA"
}
```

---

### 5.4 Saat user edit manual setelah klik suggestion

Jika user sudah klik suggestion, lalu mengubah text subbrand secara manual, FE harus reset:

```js
form.subbrand_id = null;
```

Tujuannya agar UUID subbrand lama tidak ikut terkirim ketika user sebenarnya sedang input subbrand baru.

---

## 6. Payload Create Item Parent

### Endpoint

```http
POST /api/item/item-parents
```

### Case 1: User pilih suggestion existing

FE kirim `subbrand_id` dan `sub_brand`.

```json
{
  "subbrand_id": "e8216f61-79ae-11f1-b653-a0ad9f5456d0",
  "sub_brand": "ORCA",
  "brand_id": null,
  "item_name": null,
  "category_id": "2bba577b-7921-11f1-930e-a0ad9f5456d0",
  "item_type_id": null,
  "port_id": null,
  "parent_name": "GOTO ORCA SHOWER",
  "status": "active"
}
```

Backend akan:

1. Validasi `subbrand_id`.
2. Insert `item_parents`.
3. Sync `master_subbrand_items`.

---

### Case 2: User input subbrand baru manual

FE kirim `subbrand_id: null`, tapi `sub_brand` diisi.

```json
{
  "subbrand_id": null,
  "sub_brand": "TESTSUBBRAND",
  "brand_id": null,
  "item_name": null,
  "category_id": "2bba577b-7921-11f1-930e-a0ad9f5456d0",
  "item_type_id": null,
  "port_id": null,
  "parent_name": "GOTO TESTSUBBRAND SAMPLE PRODUCT",
  "status": "active"
}
```

Backend akan:

1. Cari `master_subbrands.name = TESTSUBBRAND`.
2. Jika belum ada, otomatis create `master_subbrands`.
3. Insert `item_parents`.
4. Sync `master_subbrand_items`.

---

### Case 3: Tanpa subbrand

FE boleh kirim `subbrand_id` dan `sub_brand` kosong.

```json
{
  "subbrand_id": null,
  "sub_brand": null,
  "brand_id": null,
  "item_name": null,
  "category_id": "2bba577b-7921-11f1-930e-a0ad9f5456d0",
  "item_type_id": null,
  "port_id": null,
  "parent_name": "NO SUBBRAND TEST PRODUCT",
  "status": "active"
}
```

Backend akan:

1. Insert `item_parents`.
2. Tidak insert `master_subbrands`.
3. Tidak insert `master_subbrand_items`.

---

## 7. Payload Update Item Parent

### Endpoint

```http
PUT /api/item/item-parents/{id}
```

### Example Payload

```json
{
  "subbrand_id": null,
  "sub_brand": "FOCA",
  "brand_id": null,
  "item_name": null,
  "category_id": "2bba577b-7921-11f1-930e-a0ad9f5456d0",
  "item_type_id": null,
  "port_id": null,
  "parent_name": "GOTO FOCA FOLDABLE CHAIR UPDATED",
  "status": "active"
}
```

### Notes

- FE boleh kirim partial payload.
- Jika field tidak dikirim, BE akan menggunakan value existing.
- Jika field dikirim `null`, BE akan update menjadi `NULL` untuk field nullable.
- `parent_code` tidak boleh dikirim dari FE.
- `parent_code` auto generate dari BE saat create.

---

## 8. Required & Nullable Fields

### Required

| Field | Required | Notes |
|---|---:|---|
| `category_id` | Yes | Harus valid dari `master_categories` |
| `parent_name` | Yes | Nama parent wajib |
| `status` | Yes saat update | Saat create default `active` jika tidak dikirim |

### Nullable

| Field | Nullable | Notes |
|---|---:|---|
| `subbrand_id` | Yes | Jika kosong tapi `sub_brand` diisi, BE akan resolve/create |
| `sub_brand` | Yes | Snapshot text subbrand |
| `brand_id` | Yes | Sekarang boleh `NULL` |
| `item_name` | Yes | Sekarang boleh `NULL` |
| `item_type_id` | Yes | Optional |
| `port_id` | Yes | Optional |

---

## 9. Status yang Valid

Field `status` hanya boleh berisi:

```text
draft
active
inactive
discontinued
```

Jika `status = inactive`, backend akan menonaktifkan child item terkait parent tersebut.

---

## 10. Endpoint List Item Parents

### URL

```http
GET /api/item/item-parents
```

### Query Params

| Query | Notes |
|---|---|
| `search` | Search parent code, subbrand, parent name, brand, category, item type, port |
| `status` | Filter by status |
| `subbrand_id` | Filter by subbrand |
| `brand_id` | Filter by brand |
| `category_id` | Filter by category |
| `item_type_id` | Filter by item type |
| `port_id` | Filter by port |
| `page` | Pagination page |
| `limit` | Pagination limit |

### Example

```http
GET /api/item/item-parents?search=FOCA&limit=10
```

---

## 11. Endpoint Detail Item Parent

### URL

```http
GET /api/item/item-parents/{id}
```

### Response Example

```json
{
  "success": true,
  "message": "Item parent retrieved successfully",
  "data": {
    "id": "uuid",
    "parent_code": "P000001",
    "subbrand_id": "uuid-subbrand",
    "sub_brand": "FOCA",
    "item_name": null,
    "parent_name": "GOTO FOCA FOLDABLE CHAIR",
    "status": "active",
    "created_by": "uuid-user",
    "updated_by": "uuid-user",
    "created_at": "2026-07-07 10:00:00",
    "updated_at": "2026-07-07 10:00:00",
    "subbrand": {
      "id": "uuid-subbrand",
      "name": "FOCA",
      "normalized_name": "foca",
      "is_active": 1
    },
    "brand": null,
    "category": {
      "id": "uuid-category",
      "detail_category": "FURNITURE",
      "sub_category": "HOME & LIVING",
      "main_category": "HOME & LIVING",
      "brand_category": "PRIVATE BRAND",
      "pic_id": "uuid-pic"
    },
    "item_type": null,
    "port": null
  }
}
```

Notes:

- `brand` bisa `null`.
- `item_name` bisa `null`.
- `subbrand` bisa `null`.
- `sub_brand` tetap ada sebagai snapshot text.

---

## 12. Response Create / Update Item Parent

Response create/update akan mengembalikan data item parent terbaru dengan format yang sama seperti detail.

### Example

```json
{
  "success": true,
  "message": "Item parent created successfully",
  "data": {
    "id": "uuid",
    "parent_code": "P000001",
    "subbrand_id": "uuid-subbrand",
    "sub_brand": "FOCA",
    "item_name": null,
    "parent_name": "GOTO FOCA FOLDABLE CHAIR",
    "status": "active",
    "subbrand": {
      "id": "uuid-subbrand",
      "name": "FOCA",
      "normalized_name": "foca",
      "is_active": 1
    },
    "brand": null,
    "category": {
      "id": "uuid-category",
      "detail_category": "FURNITURE",
      "sub_category": "HOME & LIVING",
      "main_category": "HOME & LIVING",
      "brand_category": "PRIVATE BRAND",
      "pic_id": "uuid-pic"
    },
    "item_type": null,
    "port": null
  }
}
```

---

## 13. Similarity Score Logic

FE tidak perlu menghitung score sendiri.

Score dihitung runtime oleh backend berdasarkan input user dan data di `master_subbrands`.

Backend menggunakan kombinasi:

- Levenshtein distance untuk typo tolerance.
- LCS untuk urutan kemiripan karakter.
- Bonus jika prefix sama.
- Bonus jika target mengandung input.
- Bonus jika huruf awal sama.
- Bonus jika huruf akhir sama.
- Penalty jika panjang kata terlalu berbeda.

Contoh:

```text
Input: FOCA
Target: ORCA
Score: 75
```

Score bukan data tetap di database, karena akan berubah tergantung input user.

---

## 14. Recommended FE State

```js
const [subBrandInput, setSubBrandInput] = useState('');
const [selectedSubbrandId, setSelectedSubbrandId] = useState(null);
const [similarityRows, setSimilarityRows] = useState([]);
const [similarityLoading, setSimilarityLoading] = useState(false);
```

---

## 15. Recommended FE Fetch Logic

```js
useEffect(() => {
  const input = subBrandInput.trim();

  if (!input) {
    setSimilarityRows([]);
    return;
  }

  const timeout = setTimeout(async () => {
    try {
      setSimilarityLoading(true);

      const res = await api.get('/item/item-parents/helpers/subbrands', {
        params: {
          input,
          limit: 30,
          min_score: 35,
        },
      });

      setSimilarityRows(res.data?.data || []);
    } catch (error) {
      setSimilarityRows([]);
    } finally {
      setSimilarityLoading(false);
    }
  }, 300);

  return () => clearTimeout(timeout);
}, [subBrandInput]);
```

---

## 16. Recommended FE Table

```jsx
<table>
  <thead>
    <tr>
      <th>Sub Brand</th>
      <th>Parent Name</th>
      <th>Score</th>
    </tr>
  </thead>

  <tbody>
    {similarityLoading ? (
      <tr>
        <td colSpan="3">Loading...</td>
      </tr>
    ) : similarityRows.length === 0 ? (
      <tr>
        <td colSpan="3">No suggestion found</td>
      </tr>
    ) : (
      similarityRows.map((row) => (
        <tr
          key={`${row.subbrand_id}-${row.parent_name}`}
          onClick={() => {
            setSelectedSubbrandId(row.subbrand_id);
            setSubBrandInput(row.sub_brand);
          }}
        >
          <td>{row.sub_brand}</td>
          <td>{row.parent_name}</td>
          <td>{Number(row.score).toFixed(2)}</td>
        </tr>
      ))
    )}
  </tbody>
</table>
```

---

## 17. Submit Payload dari FE

Saat submit, FE disarankan selalu kirim dua field ini:

```json
{
  "subbrand_id": "uuid-atau-null",
  "sub_brand": "text-atau-null"
}
```

Rules:

| Kondisi | `subbrand_id` | `sub_brand` |
|---|---|---|
| User pilih suggestion | UUID suggestion | Nama suggestion |
| User input manual | `null` | Text input user |
| User kosongkan subbrand | `null` | `null` |

---

## 18. Error Validation yang Perlu Ditangani FE

### Category kosong

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "category_id": "Category is required"
  }
}
```

### Parent name kosong

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "parent_name": "Parent name is required"
  }
}
```

### Subbrand ID tidak valid

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "subbrand_id": "Subbrand not found"
  }
}
```

### Parent code dikirim dari FE

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "parent_code": "Parent code is auto generated and cannot be sent from request"
  }
}
```

---

## 19. Notes Penting untuk FE

- Jangan generate `parent_code` di FE.
- Jangan kirim `parent_code` di payload.
- Jangan hitung similarity score di FE.
- FE cukup consume endpoint helper similarity.
- Jika user klik suggestion, simpan `subbrand_id`.
- Jika user edit manual setelah klik suggestion, reset `subbrand_id` ke `null`.
- Saat submit, selalu kirim `subbrand_id` dan `sub_brand`.
- `brand_id` boleh `null`.
- `item_name` boleh `null`.
- `category_id` wajib.
- `parent_name` wajib.
- `status` harus salah satu dari:
  - `draft`
  - `active`
  - `inactive`
  - `discontinued`

---

## 20. Checklist FE Implementation

- [ ] Tambahkan field/state `subbrand_id`.
- [ ] Field `sub_brand` tetap ada.
- [ ] Tambahkan debounce saat user mengetik Sub Brand.
- [ ] Consume endpoint `GET /api/item/item-parents/helpers/subbrands`.
- [ ] Render tabel similarity dengan kolom Sub Brand, Parent Name, Score.
- [ ] Saat row suggestion diklik, isi `subbrand_id` dan `sub_brand`.
- [ ] Saat user edit manual setelah memilih suggestion, reset `subbrand_id`.
- [ ] Update payload create item parent.
- [ ] Update payload update item parent.
- [ ] Pastikan `brand_id` bisa `null`.
- [ ] Pastikan `item_name` bisa `null`.
- [ ] Pastikan tidak mengirim `parent_code`.
- [ ] Handle validation error dari BE.