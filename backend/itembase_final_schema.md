# ItemBase Final Database Schema

Dokumen ini berisi final schema `CREATE TABLE` untuk database `itembase` berdasarkan diskusi terakhir.

Scope dokumen ini hanya untuk database `itembase`.

Tabel central `pilargroup` seperti `central_users`, `master_departments`, `master_business_units`, dan `master_business_unit_departments` diasumsikan sudah tersedia dari awal dan hanya direferensikan oleh `itembase` melalui ID, tanpa foreign key langsung lintas database.

---

## Ringkasan Tabel

Urutan create table yang aman:

```txt
1. master_pics
2. master_pic_users
3. master_categories
4. master_item_types
5. master_ports
6. master_uoms
7. master_sku_statuses
8. master_brands
9. item_parents
10. items
11. item_channels
```

---

## 1. master_pics

PIC adalah owner category, bukan owner langsung item/SKU.

```sql
CREATE TABLE master_pics (
  id varchar(36) NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_pic_code (code),
  UNIQUE KEY uq_pic_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data:

```txt
ERNEST
MELAWATI
AGUS
JEANEVER
DESSY
KATHERINE
KATH - JEAN
KATH - MELA
GENERAL
KEVIN
SEPTIAR
UMMA
```

---

## 2. master_pic_users

Satu PIC bisa berisi lebih dari satu user central.

`central_user_id` mereferensikan `pilargroup.central_users.id`, tetapi tidak dibuat foreign key langsung karena berada di database berbeda.

```sql
CREATE TABLE master_pic_users (
  id varchar(36) NOT NULL,
  pic_id varchar(36) NOT NULL,
  central_user_id varchar(36) NOT NULL,
  role varchar(50) DEFAULT NULL,
  is_primary tinyint(1) NOT NULL DEFAULT 0,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_pic_user (pic_id, central_user_id),
  KEY idx_pic_id (pic_id),
  KEY idx_central_user_id (central_user_id),

  CONSTRAINT fk_pic_user_pic
    FOREIGN KEY (pic_id) REFERENCES master_pics(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh konsep data:

```txt
PIC: KATH - JEAN
Members:
- central_user_id milik Katherine
- central_user_id milik Jeanever

PIC: ERNEST
Members:
- central_user_id milik Ernest
```

---

## 3. master_categories

Category memakai opsi A: satu row mewakili satu `Detail Category`.

PIC menempel ke `master_categories.pic_id`, bukan ke `items`.

```sql
CREATE TABLE master_categories (
  id varchar(36) NOT NULL,
  detail_category varchar(150) NOT NULL,
  sub_category varchar(150) NOT NULL,
  main_category varchar(150) NOT NULL,
  brand_category varchar(100) NOT NULL,
  pic_id varchar(36) DEFAULT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_detail_category (detail_category),
  KEY idx_sub_category (sub_category),
  KEY idx_main_category (main_category),
  KEY idx_brand_category (brand_category),
  KEY idx_pic_id (pic_id),

  CONSTRAINT fk_category_pic
    FOREIGN KEY (pic_id) REFERENCES master_pics(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data:

```txt
detail_category : HOME APPLIANCE & ACCESSORIES
sub_category    : ELECTRONIC
main_category   : ELECTRONIC
brand_category  : PRIVATE BRAND
pic             : ERNEST
```

```txt
detail_category : MOMS, KIDS & BABY
sub_category    : MOMS, KIDS & BABY
main_category   : MOMS, KIDS & BABY
brand_category  : PRIVATE BRAND
pic             : KATH - MELA
```

PIC item didapat melalui relasi:

```txt
items
→ item_parents
→ master_categories
→ master_pics
```

---

## 4. master_item_types

```sql
CREATE TABLE master_item_types (
  id varchar(36) NOT NULL,
  code varchar(30) NOT NULL,
  name varchar(100) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_item_type_code (code),
  UNIQUE KEY uq_item_type_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data:

```txt
MANUFACTURE
LOCAL
IMPORT
SERVICE
VOUCHER
DISCOUNT
COST
BUNDLE
```

---

## 5. master_ports

Port disimpan sebagai master text karena sebagian data berupa route/kombinasi port.

```sql
CREATE TABLE master_ports (
  id varchar(36) NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(150) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_port_code (code),
  UNIQUE KEY uq_port_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data:

```txt
SHEKOU
QINGDAO
XIAMEN
NINGBO
SHANGHAI
TIANJIN
JAKARTA
NINGBO SHANGHAI
SHANGHAI NINGBO
NINGBO HANGZHOU
NINGBO SHANGHAI SHEKOU
DA CHAN BAY, SHEKOU
SHEKOUDA CHAN BAY
QINGDAO XINGANG
XINGANG
QINGDAO LIANYUNGANG
NINGBO SHANGHAI NINGBO
NNGBO
SHEKOU NANSHA
ZHANJIANG DA CHAN BAY
NANSHA
XINGANG TIANJIN
QINGDAO TIANJIN
NINGBO, SHEKOU
ZHONGSHAN
QINGDAO SHEKOU
LELIU
NINGBO LIANYUNGANG
SHANGHAI QINGDAO
QINGDAO, NINGBO
DA CHAN BAY
NINGBO, XINGANG
SHANTOU
SHENZHEN
```

---

## 6. master_uoms

```sql
CREATE TABLE master_uoms (
  id varchar(36) NOT NULL,
  code varchar(30) NOT NULL,
  name varchar(100) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_uom_code (code),
  UNIQUE KEY uq_uom_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data:

```txt
Bar
Box
cm
Doz
Gr
Kg
L
Mtr
mm
Pack
Pair
Pcs
Roll
Set
Sheet
Tube
Yrd
Unit
```

---

## 7. master_sku_statuses

Status SKU dibuat master table karena status lama bisa punya variasi/typo.

```sql
CREATE TABLE master_sku_statuses (
  id varchar(36) NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_sku_status_code (code),
  UNIQUE KEY uq_sku_status_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data awal:

```txt
NEW DEVELOPMENT
ACTIVE
INACTIVE
DISCONTINUE
OPEN BOX
```

---

## 8. master_brands

Brand utama untuk item parent.

Sub Brand bukan master table. Sub Brand adalah free text di `item_parents.sub_brand`.

```sql
CREATE TABLE master_brands (
  id varchar(36) NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_code (code),
  UNIQUE KEY uq_brand_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh data:

```txt
GOTO
CORETECH
KOVA
GOSAVE
LEGION
KV
ZHONG GUAN CUN
MAX WELDER
PREMIUM
RIDON
PUSO
MILLIARD
NACHI
NB
BENZ
JASON
TR
ID
CH
JS
BUNDLE
MP
TIKTOK
ELEGA
HERBORIST
SIXSENCE
TA
MTC
YUNIKON
ASM
CARASUN
DERMA ANGEL
ROTOTO
MAX STRONG
FUJISTAR
NIKKEN
I SAFE
3M
YONE
MG
SHUANG GE
TOYO
TOP-1
OI
GOSAVE ECO
GOSAVE PRO
YAMAWA
```

---

## 9. item_parents

`item_parents` adalah product family / induk SKU.

Business Unit tidak ada di parent.

Sub Brand adalah free text.

```sql
CREATE TABLE item_parents (
  id varchar(36) NOT NULL,
  parent_code varchar(30) NOT NULL,

  brand_id varchar(36) NOT NULL,
  sub_brand varchar(100) DEFAULT NULL,

  item_name varchar(255) NOT NULL,
  category_id varchar(36) NOT NULL,
  item_type_id varchar(36) DEFAULT NULL,
  port_id varchar(36) DEFAULT NULL,

  parent_name varchar(255) NOT NULL,

  status enum('draft','active','inactive','discontinued') NOT NULL DEFAULT 'active',

  created_by varchar(36) DEFAULT NULL,
  updated_by varchar(36) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_parent_code (parent_code),
  KEY idx_parent_brand_id (brand_id),
  KEY idx_parent_category_id (category_id),
  KEY idx_parent_item_type_id (item_type_id),
  KEY idx_parent_port_id (port_id),
  KEY idx_parent_status (status),

  CONSTRAINT fk_item_parent_brand
    FOREIGN KEY (brand_id) REFERENCES master_brands(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_item_parent_category
    FOREIGN KEY (category_id) REFERENCES master_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_item_parent_item_type
    FOREIGN KEY (item_type_id) REFERENCES master_item_types(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_item_parent_port
    FOREIGN KEY (port_id) REFERENCES master_ports(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Mapping data lama:

```txt
Parent ID       -> parent_code
Brand           -> brand_id
Sub Brand       -> sub_brand
Item Name       -> item_name
Detail Category -> category_id
Item Type       -> item_type_id
Port            -> port_id
Parent Name     -> parent_name
```

Contoh data:

```txt
parent_code     : P001989
brand           : GOTO
sub_brand       : BUNNO
item_name       : BACKPACK KIDS
detail_category : MOMS, KIDS & BABY
item_type       : IMPORT
port            : XINGANG
parent_name     : GOTO BUNNO BACKPACK KIDS
```

---

## 10. items

`items` adalah SKU final.

Rules:

```txt
barcode dan item_code dipisah
barcode tidak boleh duplicate
item_code tidak boleh duplicate
barcode nullable
item_code wajib
```

Business Unit ada di level item.

PIC tidak ada di items. PIC dibaca dari category parent.

`business_unit_id` mereferensikan `pilargroup.master_business_units.id`, tetapi tidak dibuat foreign key langsung karena berada di database berbeda.

```sql
CREATE TABLE items (
  id varchar(36) NOT NULL,

  item_code varchar(100) NOT NULL,
  barcode varchar(100) DEFAULT NULL,
  item_name varchar(255) NOT NULL,

  parent_id varchar(36) DEFAULT NULL,
  uom_id varchar(36) DEFAULT NULL,
  sku_status_id varchar(36) DEFAULT NULL,

  business_unit_id varchar(36) DEFAULT NULL,

  variant varchar(150) DEFAULT NULL,
  qty_per_pack decimal(10,2) DEFAULT NULL,

  height decimal(10,2) DEFAULT NULL,
  width decimal(10,2) DEFAULT NULL,
  depth decimal(10,2) DEFAULT NULL,
  gross_weight_pack decimal(10,2) DEFAULT NULL,

  container_20ft_qty decimal(12,2) DEFAULT NULL,
  container_40hq_qty decimal(12,2) DEFAULT NULL,
  production_time_days decimal(10,2) DEFAULT NULL,

  is_active tinyint(1) NOT NULL DEFAULT 1,

  created_by varchar(36) DEFAULT NULL,
  updated_by varchar(36) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),

  UNIQUE KEY uq_items_item_code (item_code),
  UNIQUE KEY uq_items_barcode (barcode),

  KEY idx_items_parent_id (parent_id),
  KEY idx_items_uom_id (uom_id),
  KEY idx_items_sku_status_id (sku_status_id),
  KEY idx_items_business_unit_id (business_unit_id),
  KEY idx_items_is_active (is_active),

  CONSTRAINT fk_items_parent
    FOREIGN KEY (parent_id) REFERENCES item_parents(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_items_uom
    FOREIGN KEY (uom_id) REFERENCES master_uoms(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_items_sku_status
    FOREIGN KEY (sku_status_id) REFERENCES master_sku_statuses(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Mapping data lama:

```txt
Barcode         -> barcode
Item ID         -> item_code
Item Name       -> item_name
UOM             -> uom_id
Parent Name     -> dari item_parents.parent_name
Variant         -> variant
Parent ID       -> parent_id via parent_code
Qty / Pack      -> qty_per_pack
H               -> height
W               -> width
D               -> depth
GW Pack         -> gross_weight_pack
20feet          -> container_20ft_qty
40HQ            -> container_40hq_qty
Production time -> production_time_days
Status SKU      -> sku_status_id
BISNIS UNIT     -> business_unit_id
CHANNEL         -> item_channels
PIC             -> derived dari master_categories.pic_id
```

Contoh data lama:

```txt
Barcode         : 682500002020
Item ID         : 682500002020
Item Name       : GOTO MOSTA INSECT KILLER WD-243 MEDIUM
UOM             : Pcs
Parent Name     : GOTO MOSTA INSECT KILLER
Variant         : MEDIUM
Parent ID       : P002018
Qty / Pack      : 20
H               : 55
W               : 44
D               : null
GW Pack         : null
20feet          : null
40HQ            : null
Production time : null
Status SKU      : NEW DEVELOPMENT
BISNIS UNIT     : GOTO
CHANNEL         : ECOM
BRAND CATEGORY  : PRIVATE BRAND
PIC             : ERNEST
```

---

## 11. item_channels

Satu item bisa punya lebih dari satu channel.

Channel berasal dari `pilargroup.master_departments`.

`department_id` mereferensikan `pilargroup.master_departments.id`, tetapi tidak dibuat foreign key langsung karena berada di database berbeda.

`business_unit_id` mereferensikan `pilargroup.master_business_units.id`, tetapi tidak dibuat foreign key langsung karena berada di database berbeda.

```sql
CREATE TABLE item_channels (
  id varchar(36) NOT NULL,
  item_id varchar(36) NOT NULL,

  business_unit_id varchar(36) DEFAULT NULL,
  department_id int(11) NOT NULL,

  channel_name varchar(150) DEFAULT NULL,
  channel_code varchar(30) DEFAULT NULL,

  is_primary tinyint(1) NOT NULL DEFAULT 0,
  is_active tinyint(1) NOT NULL DEFAULT 1,

  created_at datetime DEFAULT current_timestamp(),
  updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (id),
  UNIQUE KEY uq_item_department (item_id, department_id),

  KEY idx_item_channels_item_id (item_id),
  KEY idx_item_channels_business_unit_id (business_unit_id),
  KEY idx_item_channels_department_id (department_id),
  KEY idx_item_channels_is_active (is_active),

  CONSTRAINT fk_item_channels_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Contoh konsep data:

```txt
Item:
682500002020 - GOTO MOSTA INSECT KILLER WD-243 MEDIUM

Business Unit:
GOTO

Channels:
- GOTO E-Commerce
- GOTO Store
- GOTO GT
```

Backend harus validasi:

```txt
item_channels.department_id harus valid untuk items.business_unit_id
berdasarkan pilargroup.master_business_unit_departments
```

---

## Entity Relation Summary

Central reference:

```txt
pilargroup.master_companies
↓
pilargroup.master_business_units
↓
pilargroup.master_business_unit_departments
↓
pilargroup.master_departments
```

PIC:

```txt
itembase.master_pics
↓
itembase.master_pic_users
↓
pilargroup.central_users
```

Category to Item:

```txt
itembase.master_pics
↓
itembase.master_categories
↓
itembase.item_parents
↓
itembase.items
↓
itembase.item_channels
```

Brand:

```txt
itembase.master_brands
↓
itembase.item_parents
```

UOM:

```txt
itembase.master_uoms
↓
itembase.items
```

SKU Status:

```txt
itembase.master_sku_statuses
↓
itembase.items
```

---

## Key Decisions

```txt
master_categories:
- pakai opsi A
- satu row = satu detail_category
- pic_id nempel di category

PIC:
- tidak ada di items
- PIC adalah owner category
- master_pics ada di itembase
- master_pic_users mapping ke central_users

item_parents:
- business_unit_id tidak ada
- brand_id dari master_brands
- sub_brand free text
- category_id wajib
- parent_code unique

items:
- barcode dan item_code dipisah
- barcode unique nullable
- item_code unique wajib
- business_unit_id ada di item
- 1 item bisa banyak channel via item_channels
- production_time_days decimal
- H/W/D/GW decimal nullable
- PIC derived dari category

Business Unit:
- sumber dari central pilargroup.master_business_units
- tidak dibuat master business unit ulang di itembase

Channel:
- sumber dari central pilargroup.master_departments
- itembase menyimpan pilihan channel aktual di item_channels

master_business_unit_departments:
- daftar channel valid per BU di central pilargroup

item_channels:
- channel aktual yang dipilih untuk item tertentu
```
