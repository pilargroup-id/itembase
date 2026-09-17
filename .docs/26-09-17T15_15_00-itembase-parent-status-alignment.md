# ItemBase - Parent Status Alignment

## Scope

Perubahan ini menyelaraskan status `item_parents` dengan status `items`.

Status final untuk Parent dan SKU:

- `ACTIVE`
- `INACTIVE`
- `DISCONTINUE`

Status lama Parent (`draft`, `active`, `inactive`, `discontinued`) tidak lagi digunakan setelah migration.

## Database

Jalankan migration:

`backend/database/migrations/20260917_align_item_parent_status.sql`

Migration mengubah `item_parents.status` menjadi:

`ENUM('ACTIVE','INACTIVE','DISCONTINUE') NOT NULL DEFAULT 'ACTIVE'`

Mapping legacy:

- `active` -> `ACTIVE`
- `inactive` -> `INACTIVE`
- `discontinued` -> `DISCONTINUE`
- `draft` -> `ACTIVE`

## Parent Status Endpoint

Endpoint ini sebenarnya sudah ada pada backend terbaru dan tetap digunakan:

`PATCH /api/item/item-parents/:id/status`

Body:

```json
{
  "status": "DISCONTINUE"
}
```

Value yang diterima:

- `ACTIVE`
- `INACTIVE`
- `DISCONTINUE`

Backend menormalisasi input status ke uppercase.

Legacy body `is_active` masih diterima untuk kompatibilitas:

- `1` -> `ACTIVE`
- `0` -> `INACTIVE`

`is_active` tidak dapat mewakili `DISCONTINUE`, sehingga FE baru harus menggunakan field `status`.

### Child SKU behavior

Behavior lama dipertahankan:

- Parent berubah ke `INACTIVE`: child SKU dengan status `ACTIVE` ikut menjadi `INACTIVE` dan dibuat activity log `STATUS_CHANGE` per SKU.
- Parent berubah ke `DISCONTINUE`: tidak otomatis mengubah status child SKU. Tidak ada business rule baru untuk cascade discontinue pada scope revisi ini.

## Parent Export

Endpoint:

`GET /api/item-data/export/parents`

Filter:

- tanpa `status` -> semua Parent
- `?status=ACTIVE`
- `?status=INACTIVE`
- `?status=DISCONTINUE`

Lowercase dari FE tetap dinormalisasi ke uppercase oleh service.

## SKU Export

Backend terbaru sebenarnya sudah mendukung filter SKU berikut dan tidak perlu perubahan logic:

- `GET /api/item-data/export/items?status=ACTIVE`
- `GET /api/item-data/export/items?status=INACTIVE`
- `GET /api/item-data/export/items?status=DISCONTINUE`

Tanpa parameter `status` berarti export semua status.

## Parent Import

Kolom `Status` pada template Parent sekarang menggunakan:

- `ACTIVE`
- `INACTIVE`
- `DISCONTINUE`

Create Parent tanpa Status akan default ke `ACTIVE`.

Import tidak lagi menerima status `draft` atau `discontinued` sebagai enum Parent.

## FE Notes

Untuk dropdown/filter status Parent, gunakan opsi yang sama dengan SKU:

```text
ACTIVE
INACTIVE
DISCONTINUE
```

Untuk update status Parent, gunakan endpoint PATCH khusus status dan jangan melakukan full PUT hanya untuk mengganti status.
