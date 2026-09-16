# Itembase - Master Import Revision

## Scope

Dokumen ini menjelaskan perubahan template dan flow import Master Itembase setelah revisi 16 September 2026. Endpoint existing tetap digunakan; tidak ada endpoint baru untuk flow import Master.

## Endpoint yang Tetap Digunakan

- Download template: `GET /api/item-data/templates/masters/:type`
- Preview import: `POST /api/item-data/imports/masters/:type/preview`
- Commit import: `POST /api/item-data/imports/masters/commit`
- Cancel preview: `DELETE /api/item-data/imports/masters/preview/:token`
- Download error file: `GET /api/item-data/imports/masters/errors/:token`

Supported `:type` tetap:

- `brands`
- `categories`
- `item-sources`
- `ports`
- `uoms`
- `variant-attributes`
- `variant-values`
- `sub-brands`

## Master Categories

Template sheet `Categories` sekarang memiliki kolom:

1. `Category`
2. `Sub Category`
3. `Main Category`
4. `Brand Category`
5. `PIC`
6. `Status`

`PIC` diisi menggunakan **username** user PilarGroup dari Department Product.

Contoh satu PIC:

```text
azi
```

Contoh lebih dari satu PIC:

```text
azi;andi;budi
```

Rule:

- separator multiple PIC adalah `;`
- username pertama menjadi primary PIC
- backend me-resolve username menjadi `central_user_id`
- hanya user aktif dari Department Product yang valid
- jika kolom `PIC` kosong pada UPDATE, relasi PIC existing tidak diubah

Template Categories memiliki helper sheet baru:

```text
Ref PIC Users
```

Kolom helper:

- `Username`
- `Name`
- `Email`

Data helper diambil dari directory PilarGroup dan difilter ke user aktif Department Product.

## Master Brands

Kolom `Code` dihapus dari template import. Code Brand sekarang digenerate otomatis oleh backend dari `Name`.

Template sheet `Brands` sekarang:

1. `Name`
2. `Business Unit Code`
3. `Channel Code`
4. `Status`

Contoh:

```text
Name        | Business Unit Code | Channel Code | Status
GOTO ASAHI  | GOTO               | GTE          | Active
```

Backend me-resolve:

```text
Business Unit Code -> business_unit_id
Channel Code       -> department_id + channel_name + channel_code
```

`Channel Code` menggunakan code department/channel yang berada di bawah Business Unit tersebut.

Multiple channel didukung menggunakan pasangan `;` berdasarkan urutan.

Contoh:

```text
Business Unit Code = GOTO;GOTO
Channel Code       = GTE;GTR
```

Berarti pasangan yang diproses:

```text
GOTO + GTE
GOTO + GTR
```

Jumlah Business Unit Code dan Channel Code wajib sama.

Channel pertama otomatis menjadi primary.

Jika kedua kolom Business Unit Code dan Channel Code kosong pada UPDATE, relasi channel existing tidak diubah.

Template Brands memiliki helper sheet baru:

```text
Ref Brand Channels
```

Kolom helper:

- `Business Unit Code`
- `Business Unit Name`
- `Channel Code`
- `Channel Name`

Helper hanya menampilkan Business Unit dan channel/department yang aktif.

## Auto Generate Code

Code tidak lagi diminta di template import berikut:

- Brand
- Item Source
- UOM
- Variant Attribute
- Variant Value

Backend generate code dari Name menggunakan rule:

```text
Dark Blue     -> DARK_BLUE
Box / Set     -> BOX_SET
Local Product -> LOCAL_PRODUCT
```

Secara umum:

1. trim value
2. uppercase
3. karakter selain huruf/angka menjadi `_`
4. underscore di awal/akhir dibuang

Port **tidak berubah**. `Port Code` tetap diinput manual karena memiliki rule tersendiri yang berkaitan dengan Country Code.

## Master Item Sources

Template sebelumnya:

```text
Item Source Code | Item Source Name | Status
```

Menjadi:

```text
Item Source Name | Status
```

`Item Source Code` dibuat otomatis dari `Item Source Name`.

## Master UOM

Template sebelumnya:

```text
UOM Code | UOM Name | Status
```

Menjadi:

```text
UOM Name | Status
```

`UOM Code` dibuat otomatis dari `UOM Name`.

## Master Variant Attributes

Template sebelumnya:

```text
Attribute Code | Attribute Name | Status
```

Menjadi:

```text
Attribute Name | Status
```

`Attribute Code` dibuat otomatis dari `Attribute Name`.

## Master Variant Values

Template sebelumnya:

```text
Attribute Code | Value Code | Value Name | Status
```

Menjadi:

```text
Attribute Code | Value Name | Sort Order | Status
```

Rule:

- `Attribute Code` tetap diperlukan untuk menentukan Variant Attribute parent
- `Value Code` dibuat otomatis dari `Value Name`
- `Value Name` disimpan uppercase sesuai behavior existing
- `Sort Order` harus integer positif jika diisi
- pada CREATE, jika `Sort Order` kosong, backend menggunakan urutan berikutnya untuk attribute tersebut
- pada UPDATE, jika `Sort Order` kosong, sort order existing tetap dipertahankan

Contoh:

```text
Attribute Code | Value Name | Sort Order | Status
COLOR          | Dark Blue  | 3          | Active
```

Hasil backend:

```text
attribute_code = COLOR
value_name     = DARK BLUE
value_code     = DARK_BLUE
sort_order     = 3
```

## Status

Semua template Master tetap menggunakan display value:

```text
Active
Inactive
```

Backend tetap menerima normalisasi kompatibel existing (`1/0`, `true/false`, `yes/no`), tetapi template resmi menggunakan `Active` / `Inactive`.

## Example Row

Setiap template masih memiliki satu row contoh setelah header.

Row yang menggunakan prefix `EXAMPLE` otomatis di-ignore oleh import preview dan tidak dimasukkan ke database.

## Flow FE

FE tidak perlu mengubah flow upload/preview/commit. Yang perlu diperhatikan hanya header template baru dan helper sheet.

Flow tetap:

```text
Download Template
-> user isi data
-> upload XLSX ke preview
-> tampilkan valid/invalid rows
-> commit preview_token
-> jika gagal sebagian, gunakan error_file_token untuk download error file
```

Error file sekarang mengikuti header import terbaru masing-masing Master, bukan header export.
