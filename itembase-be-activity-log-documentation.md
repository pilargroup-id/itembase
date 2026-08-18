# ItemBase FE Consume - Activity Logs

Dokumentasi ini khusus untuk consume **Activity Log ItemBase** dari sisi Frontend.

Activity log dibuat otomatis oleh Backend ketika user melakukan aksi pada module master, item parent, dan items. FE tidak perlu membuat activity log manual.

---

## Base URL

```txt
http://localhost:3000/api
```

Production menyesuaikan domain API ItemBase.

---

## Auth

Semua endpoint activity log wajib menggunakan token login ItemBase.

Header:

```txt
Authorization: Bearer <TOKEN>
Accept: application/json
```

---

## Available Endpoints

```txt
GET /activity-logs
GET /activity-logs/:id
```

---

# 1. List Activity Logs

```txt
GET /activity-logs
```

## Query Parameters

| Param | Type | Required | Description |
|---|---|---:|---|
| page | number | No | Default `1` |
| limit | number | No | Default `10`, max `100` |
| search | string | No | Search by description, entity type, entity id, action, username, or user name |
| user_id | string | No | Filter by central user id |
| action | string | No | Filter by action |
| entity_type | string | No | Filter by module/table |
| entity_id | string | No | Filter by target row id |
| date_from | string | No | Format `YYYY-MM-DD` |
| date_to | string | No | Format `YYYY-MM-DD` |

## Example Request

```txt
GET /activity-logs?page=1&limit=10
```

```txt
GET /activity-logs?entity_type=items
```

```txt
GET /activity-logs?action=CREATE
```

```txt
GET /activity-logs?entity_type=master_categories&entity_id=<CATEGORY_ID>
```

```txt
GET /activity-logs?date_from=2026-06-01&date_to=2026-06-30
```

---

# 2. Detail Activity Log

```txt
GET /activity-logs/:id
```

## Example Request

```txt
GET /activity-logs/7b3df85a-f8d8-4a85-9ad7-4ff3dbb2712f
```

---

# Action Values

Value yang mungkin muncul di field `action`:

| Action | Description |
|---|---|
| CREATE | Data baru dibuat |
| UPDATE | Data existing diubah |
| DELETE | Data dihapus |
| STATUS_CHANGE | Status / is_active berubah |
| SYNC | Data disinkronkan, khusus flow seperti PIC users |

Recommended badge color FE:

| Action | Badge |
|---|---|
| CREATE | Green |
| UPDATE | Blue |
| DELETE | Red |
| STATUS_CHANGE | Orange |
| SYNC | Purple |

---

# Entity Type Values

Value yang mungkin muncul di field `entity_type`:

| Entity Type | Module |
|---|---|
| master_brands | Master Brand |
| master_pics | Master PIC |
| master_pic_users | Master PIC Users |
| master_categories | Master Category |
| master_item_types | Master Item Type |
| master_ports | Master Port |
| master_uoms | Master UOM |
| master_sku_statuses | Master SKU Status |
| item_parents | Item Parent |
| items | Items |

---

# Response Structure

## List Response Example

```json
{
  "success": true,
  "message": "Activity logs retrieved successfully",
  "data": [
    {
      "id": "7b3df85a-f8d8-4a85-9ad7-4ff3dbb2712f",
      "user_id": "central-user-id",
      "user": {
        "id": "central-user-id",
        "username": "jdoe",
        "name": "John Doe",
        "email": "jdoe@piagam.id"
      },
      "action": "CREATE",
      "entity_type": "items",
      "entity_id": "item-id",
      "description": "Created regular item 682600000001",
      "before_data": null,
      "after_data": {
        "id": "item-id",
        "item_code": "682600000001",
        "barcode": "682600000001",
        "item_name": "TEST GOTO BACKPACK RED",
        "item_kind": "regular"
      },
      "metadata": {
        "item_code": "682600000001",
        "item_kind": "regular",
        "channel_count": 1,
        "component_count": 0
      },
      "ip_address": "::1",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-06-17T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_page": 1
  }
}
```

## Detail Response Example

```json
{
  "success": true,
  "message": "Activity log retrieved successfully",
  "data": {
    "id": "7b3df85a-f8d8-4a85-9ad7-4ff3dbb2712f",
    "user_id": "central-user-id",
    "user": {
      "id": "central-user-id",
      "username": "jdoe",
      "name": "John Doe",
      "email": "jdoe@piagam.id"
    },
    "action": "UPDATE",
    "entity_type": "master_categories",
    "entity_id": "category-id",
    "description": "Updated category BACKPACK KIDS",
    "before_data": {
      "id": "category-id",
      "detail_category": "BACKPACK OLD",
      "is_active": 1
    },
    "after_data": {
      "id": "category-id",
      "detail_category": "BACKPACK KIDS",
      "is_active": 1
    },
    "metadata": {
      "detail_category": "BACKPACK KIDS",
      "sub_category": "BAG",
      "main_category": "FASHION",
      "brand_category": "GOTO",
      "pic_id": "pic-id",
      "old_is_active": 1,
      "new_is_active": 1
    },
    "ip_address": "::1",
    "user_agent": "Mozilla/5.0 ...",
    "created_at": "2026-06-17T08:00:00.000Z"
  }
}
```

---

# Field Explanation

| Field | Description |
|---|---|
| id | Activity log id |
| user_id | Central user id dari user yang melakukan aksi |
| user | Detail user dari PilarGroup central users |
| action | Jenis aksi: CREATE, UPDATE, DELETE, STATUS_CHANGE, SYNC |
| entity_type | Module/table target |
| entity_id | ID data target yang berubah |
| description | Deskripsi singkat activity |
| before_data | Snapshot data sebelum perubahan |
| after_data | Snapshot data setelah perubahan |
| metadata | Summary tambahan untuk memudahkan FE display/filter |
| ip_address | IP user saat melakukan aksi |
| user_agent | Browser/device user |
| created_at | Waktu activity dibuat |

---

# FE Display Recommendation

## List Table Columns

Recommended column untuk table activity log:

```txt
created_at
user.name / user.username
action
entity_type
description
ip_address
```

Optional column:

```txt
entity_id
user_agent
```

## Detail Modal / Drawer

Saat user klik detail, tampilkan:

```txt
General Info:
- created_at
- action
- entity_type
- entity_id
- description
- user name
- username
- ip_address
- user_agent

JSON Viewer:
- before_data
- after_data
- metadata
```

Untuk `before_data`, `after_data`, dan `metadata`, lebih enak pakai JSON viewer supaya tidak perlu bikin UI custom per module.

---

# Common Filter Examples

## Semua log items

```txt
GET /activity-logs?entity_type=items
```

## Semua log item parent

```txt
GET /activity-logs?entity_type=item_parents
```

## Semua log master category

```txt
GET /activity-logs?entity_type=master_categories
```

## Semua log berdasarkan satu item

```txt
GET /activity-logs?entity_type=items&entity_id=<ITEM_ID>
```

## Semua log berdasarkan satu item parent

```txt
GET /activity-logs?entity_type=item_parents&entity_id=<ITEM_PARENT_ID>
```

## Semua log create

```txt
GET /activity-logs?action=CREATE
```

## Semua log update status

```txt
GET /activity-logs?action=STATUS_CHANGE
```

## Search by keyword

```txt
GET /activity-logs?search=682600000001
```

```txt
GET /activity-logs?search=BACKPACK
```

## Filter by date range

```txt
GET /activity-logs?date_from=2026-06-01&date_to=2026-06-30
```

---

# Notes for FE

1. FE tidak perlu create/update/delete activity log manual.
2. Activity log otomatis dibuat dari Backend ketika user melakukan CRUD.
3. Untuk module detail page, FE bisa menampilkan tab "Activity Log" dengan filter `entity_type` dan `entity_id`.
4. Untuk halaman global audit trail, FE cukup consume `GET /activity-logs`.
5. `before_data`, `after_data`, dan `metadata` bentuknya dinamis mengikuti module, jadi jangan hardcode field terlalu spesifik.
6. `user` bisa null kalau activity dibuat tanpa user context.
7. `ip_address` dan `user_agent` hanya untuk informasi audit, bukan untuk logic utama FE.

---

# Suggested UI Pages

## Global Activity Log Page

Route FE contoh:

```txt
/activity-logs
```

Feature:

```txt
- Table activity logs
- Filter action
- Filter entity_type
- Filter date range
- Search keyword
- Detail drawer/modal
```

## Entity Activity Tab

Contoh di detail item:

```txt
/items/:id/activity
```

Request:

```txt
GET /activity-logs?entity_type=items&entity_id=<ITEM_ID>
```

Contoh di detail category:

```txt
/master/categories/:id/activity
```

Request:

```txt
GET /activity-logs?entity_type=master_categories&entity_id=<CATEGORY_ID>
```
