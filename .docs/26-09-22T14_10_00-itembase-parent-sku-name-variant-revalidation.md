# Itembase - Parent Change, Variant Revalidation, and SKU Name Regeneration

## Scope

Patch ini menggunakan `backend(6).zip` sebagai source of truth.

Tidak ada perubahan schema database dan tidak ada penambahan kolom baru.

File backend yang terdampak:

- `backend/src/services/item/item.service.js`
- `backend/src/models/item/item.model.js`
- `backend/src/services/item/item-parent.service.js`

## Rule SKU Name

Untuk item `regular`, `item_name` adalah derived value:

`Parent Name + [BD jika replenishment_type = BD] + Variant Values`

Urutan variant mengikuti `item_parent_variant_attributes.sort_order`.

`selling_name` tidak dipaksa berubah karena tetap dianggap field terpisah yang dapat memiliki value custom.

## Edit Parent Master

Jika edit parent menyebabkan `parent_name` berubah, seluruh child item dengan `item_kind = regular` pada parent tersebut akan diregenerate `item_name`-nya.

Contoh:

Sebelum:

- Parent Name: `GOTO ORVIA STACKING CUPBOARD`
- Variant: `5S TRANS`
- SKU Name: `GOTO ORVIA STACKING CUPBOARD 5S TRANS`

Parent diubah menjadi:

- Parent Name: `GOTO ORVIA STORAGE CUPBOARD`

Maka child SKU menjadi:

- SKU Name: `GOTO ORVIA STORAGE CUPBOARD 5S TRANS`

Perubahan child SKU dicatat ke `activity_logs` dengan metadata `source = PARENT_NAME_CHANGE`.

## Edit Parent pada SKU Existing

Jika `items.parent_id` berubah, backend melakukan revalidasi variant terhadap parent tujuan.

### Parent lama

- MODEL
- COLOR

SKU existing:

- MODEL = M1
- COLOR = RED

### Parent baru

- SIZE
- MODEL

Backend akan:

1. mempertahankan `MODEL = M1` karena attribute MODEL ada di parent baru;
2. membuang `COLOR = RED` karena COLOR tidak ada di parent baru;
3. mendeteksi bahwa SIZE belum memiliki value;
4. menolak update sampai SIZE dikirim oleh client;
5. setelah lengkap, mengganti relasi `item_variant_values` dengan variant valid untuk parent baru;
6. regenerate `item_name` berdasarkan parent baru.

## Response ketika Parent Baru Membutuhkan Variant Tambahan

Jika request mengubah parent tanpa mengirim variant lengkap dan terdapat attribute baru yang belum terisi, backend mengembalikan HTTP 422 dengan code:

`PARENT_VARIANTS_REQUIRED`

`errors` berisi:

- `parent_id`
- `missing_variant_attributes`
- `retained_variants`

`retained_variants` adalah variant existing yang masih valid pada parent tujuan.

FE dapat menggunakan data tersebut untuk mempertahankan pilihan yang masih kompatibel dan meminta user mengisi attribute baru.

## Request Edit SKU ketika Parent Berubah

Jika parent baru memiliki SIZE dan MODEL, request final harus mengirim semua variant parent tujuan, contoh:

```json
{
  "parent_id": "PARENT_B_UUID",
  "variants": [
    {
      "attribute_id": "SIZE_UUID",
      "value_id": "SIZE_L_UUID"
    },
    {
      "attribute_id": "MODEL_UUID",
      "value_id": "MODEL_M1_UUID"
    }
  ]
}
```

Pada saat `parent_id` berubah, backend mewajibkan variant yang dikirim cocok penuh dengan attribute parent tujuan.

## Database

Tidak ada migration.

Tabel existing yang digunakan:

- `items.parent_id`
- `item_parent_variant_attributes`
- `item_variant_values`
- `master_variant_attributes`
- `master_variant_values`

