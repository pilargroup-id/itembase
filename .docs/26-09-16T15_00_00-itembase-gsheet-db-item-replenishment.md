# Itembase - GSheet DB Item Replenishment Type

## Scope

Patch ini menambahkan `replenishment_type` ke mapping Google Sheet `DB Item`.

## Perubahan Backend

File:

`backend/src/jobs/gsheet/workbook-mappings.js`

Mapping `DB Item` sekarang membaca kolom `replenishment_type` dari BigQuery view `vw_db_item` dan menuliskannya setelah kolom `variant`.

Urutan terkait menjadi:

- `variant`
- `replenishment_type`
- `parent_id`

Nilai yang diharapkan:

- `RG`
- `SS`
- `BD`
- `NR`
- kosong jika `NULL`

## Prasyarat BigQuery

Backend saat ini membaca data GSheet dari BigQuery view `vw_db_item`, bukan langsung dari `raw_items`.

`raw_items` pada backend terbaru sudah memiliki field `replenishment_type`, tetapi view `vw_db_item` juga wajib mengekspos kolom dengan alias tepat:

`replenishment_type`

Jika view tersebut belum memiliki kolom itu, update view terlebih dahulu sebelum menjalankan job GSheet. Definisi view tidak tersimpan di backend ZIP yang diberikan, sehingga patch ini tidak mengubah SQL view secara asumtif.

## Google Sheet

Pada tab `DB Item`, tambahkan satu header baru di posisi setelah kolom Variant dan sebelum Parent ID:

`Replenishment Type`

Job sync mulai row 2 dan akan menulis value mengikuti urutan mapping tersebut.
