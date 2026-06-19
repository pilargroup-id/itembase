const crypto = require('crypto');
const { db, centralDb } = require('../../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function normalizeBooleanFilter(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return Number(value) ? 1 : 0;
}

function buildWhereClause(query = {}) {
  const conditions = [];
  const params = [];

  if (query.search) {
    const search = `%${query.search}%`;

    conditions.push(`
      (
        i.item_code LIKE ?
        OR i.barcode LIKE ?
        OR i.item_name LIKE ?
        OR i.variant LIKE ?
        OR ip.parent_code LIKE ?
        OR ip.parent_name LIKE ?
        OR mb.code LIKE ?
        OR mb.name LIKE ?
        OR mc.detail_category LIKE ?
        OR mc.sub_category LIKE ?
        OR mc.main_category LIKE ?
        OR mc.brand_category LIKE ?
        OR mu.code LIKE ?
        OR mu.name LIKE ?
        OR mss.code LIKE ?
        OR mss.name LIKE ?
        OR ic.channel_code LIKE ?
        OR ic.channel_name LIKE ?
      )
    `);

    params.push(
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      search
    );
  }

  if (query.item_kind) {
    conditions.push('i.item_kind = ?');
    params.push(query.item_kind);
  }

  if (query.parent_id) {
    conditions.push('i.parent_id = ?');
    params.push(query.parent_id);
  }

  if (query.uom_id) {
    conditions.push('i.uom_id = ?');
    params.push(query.uom_id);
  }

  if (query.sku_status_id) {
    conditions.push('i.sku_status_id = ?');
    params.push(query.sku_status_id);
  }

  if (query.business_unit_id) {
    conditions.push('i.business_unit_id = ?');
    params.push(query.business_unit_id);
  }

  const isActive = normalizeBooleanFilter(query.is_active);
  if (isActive !== null) {
    conditions.push('i.is_active = ?');
    params.push(isActive);
  }

  if (query.status) {
    conditions.push('ip.status = ?');
    params.push(query.status);
  }

  if (query.brand_id) {
    conditions.push('ip.brand_id = ?');
    params.push(query.brand_id);
  }

  if (query.category_id) {
    conditions.push('ip.category_id = ?');
    params.push(query.category_id);
  }

  if (query.item_type_id) {
    conditions.push('ip.item_type_id = ?');
    params.push(query.item_type_id);
  }

  if (query.port_id) {
    conditions.push('ip.port_id = ?');
    params.push(query.port_id);
  }

  if (query.item_code) {
    conditions.push('i.item_code = ?');
    params.push(query.item_code);
  }

  if (query.barcode) {
    conditions.push('i.barcode = ?');
    params.push(query.barcode);
  }

  if (query.item_name) {
    conditions.push('i.item_name LIKE ?');
    params.push(`%${query.item_name}%`);
  }

  if (query.variant) {
    conditions.push('i.variant LIKE ?');
    params.push(`%${query.variant}%`);
  }

  if (query.qty_per_pack) {
    conditions.push('i.qty_per_pack = ?');
    params.push(query.qty_per_pack);
  }

  if (query.height) {
    conditions.push('i.height = ?');
    params.push(query.height);
  }

  if (query.width) {
    conditions.push('i.width = ?');
    params.push(query.width);
  }

  if (query.depth) {
    conditions.push('i.depth = ?');
    params.push(query.depth);
  }

  if (query.gross_weight_pack) {
    conditions.push('i.gross_weight_pack = ?');
    params.push(query.gross_weight_pack);
  }

  if (query.container_20ft_qty) {
    conditions.push('i.container_20ft_qty = ?');
    params.push(query.container_20ft_qty);
  }

  if (query.container_40hq_qty) {
    conditions.push('i.container_40hq_qty = ?');
    params.push(query.container_40hq_qty);
  }

  if (query.production_time_days) {
    conditions.push('i.production_time_days = ?');
    params.push(query.production_time_days);
  }

  if (query.department_id) {
    conditions.push('ic.department_id = ?');
    params.push(query.department_id);
  }

  if (query.channel_code) {
    conditions.push('ic.channel_code = ?');
    params.push(query.channel_code);
  }

  if (query.channel_name) {
    conditions.push('ic.channel_name LIKE ?');
    params.push(`%${query.channel_name}%`);
  }

  const channelIsPrimary = normalizeBooleanFilter(query.channel_is_primary);
  if (channelIsPrimary !== null) {
    conditions.push('ic.is_primary = ?');
    params.push(channelIsPrimary);
  }

  const channelIsActive = normalizeBooleanFilter(query.channel_is_active);
  if (channelIsActive !== null) {
    conditions.push('ic.is_active = ?');
    params.push(channelIsActive);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function baseSelectSql() {
  return `
    SELECT DISTINCT
      i.id,
      i.item_code,
      i.barcode,
      i.item_name,
      i.item_kind,
      i.parent_id,
      i.uom_id,
      i.sku_status_id,
      i.business_unit_id,
      i.variant,
      i.qty_per_pack,
      i.height,
      i.width,
      i.depth,
      i.gross_weight_pack,
      i.container_20ft_qty,
      i.container_40hq_qty,
      i.production_time_days,
      i.is_active,
      i.created_by,
      i.updated_by,
      i.created_at,
      i.updated_at,

      ip.parent_code,
      ip.parent_name,
      ip.status AS parent_status,

      mb.id AS brand_id,
      mb.code AS brand_code,
      mb.name AS brand_name,

      mc.id AS category_id,
      mc.detail_category AS category_detail_category,
      mc.sub_category AS category_sub_category,
      mc.main_category AS category_main_category,
      mc.brand_category AS category_brand_category,
      mc.pic_id AS category_pic_id,

      mit.id AS item_type_id,
      mit.code AS item_type_code,
      mit.name AS item_type_name,

      mp.id AS port_id,
      mp.code AS port_code,
      mp.name AS port_name,

      mu.code AS uom_code,
      mu.name AS uom_name,

      mss.code AS sku_status_code,
      mss.name AS sku_status_name
    FROM items i
    LEFT JOIN item_parents ip ON ip.id = i.parent_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    LEFT JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_ports mp ON mp.id = ip.port_id
    LEFT JOIN master_uoms mu ON mu.id = i.uom_id
    LEFT JOIN master_sku_statuses mss ON mss.id = i.sku_status_id
    LEFT JOIN item_channels ic ON ic.item_id = i.id
  `;
}

function mapBaseRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    item_code: row.item_code,
    barcode: row.barcode,
    item_name: row.item_name,
    item_kind: row.item_kind,
    variant: row.variant,
    qty_per_pack: row.qty_per_pack,
    height: row.height,
    width: row.width,
    depth: row.depth,
    gross_weight_pack: row.gross_weight_pack,
    container_20ft_qty: row.container_20ft_qty,
    container_40hq_qty: row.container_40hq_qty,
    production_time_days: row.production_time_days,
    is_active: row.is_active,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent: row.parent_id
      ? {
          id: row.parent_id,
          parent_code: row.parent_code,
          parent_name: row.parent_name,
          status: row.parent_status,
          brand: row.brand_id
            ? {
                id: row.brand_id,
                code: row.brand_code,
                name: row.brand_name,
              }
            : null,
          category: row.category_id
            ? {
                id: row.category_id,
                detail_category: row.category_detail_category,
                sub_category: row.category_sub_category,
                main_category: row.category_main_category,
                brand_category: row.category_brand_category,
                pic_id: row.category_pic_id,
              }
            : null,
          item_type: row.item_type_id
            ? {
                id: row.item_type_id,
                code: row.item_type_code,
                name: row.item_type_name,
              }
            : null,
          port: row.port_id
            ? {
                id: row.port_id,
                code: row.port_code,
                name: row.port_name,
              }
            : null,
        }
      : null,
    uom: row.uom_id
      ? {
          id: row.uom_id,
          code: row.uom_code,
          name: row.uom_name,
        }
      : null,
    sku_status: row.sku_status_id
      ? {
          id: row.sku_status_id,
          code: row.sku_status_code,
          name: row.sku_status_name,
        }
      : null,
    business_unit: {
      id: row.business_unit_id,
      code: null,
      name: null,
    },
    channels: [],
    components: [],
  };
}

async function findAll(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, params } = buildWhereClause(query);

  const sql = `
    ${baseSelectSql()}
    ${whereSql}
    ORDER BY i.created_at DESC, i.item_code DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT i.id) AS total
    FROM items i
    LEFT JOIN item_parents ip ON ip.id = i.parent_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    LEFT JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_ports mp ON mp.id = ip.port_id
    LEFT JOIN master_uoms mu ON mu.id = i.uom_id
    LEFT JOIN master_sku_statuses mss ON mss.id = i.sku_status_id
    LEFT JOIN item_channels ic ON ic.item_id = i.id
    ${whereSql}
  `;

  const [rows] = await db.query(sql, [...params, limit, offset]);
  const [countRows] = await db.query(countSql, params);

  const items = rows.map(mapBaseRow);
  await enrichItems(items);

  const total = countRows[0]?.total || 0;

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    },
  };
}

async function findById(id, connection = db) {
  const sql = `
    ${baseSelectSql()}
    WHERE i.id = ?
    LIMIT 1
  `;

  const [rows] = await connection.query(sql, [id]);
  const item = mapBaseRow(rows[0]);

  if (!item) return null;

  const channels = await findChannelsByItemIds([id], connection);
  const components = await findComponentsByBundleItemIds([id], connection);

  item.channels = channels[id] || [];
  item.components = components[id] || [];

  await enrichItems([item]);

  return item;
}

async function findRawById(id, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM items
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findParentById(id, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        parent_code,
        parent_name,
        status
      FROM item_parents
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findUomById(id, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT id
      FROM master_uoms
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findSkuStatusById(id, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT id
      FROM master_sku_statuses
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findItemsByIds(ids = [], connection = db) {
  if (!ids.length) return [];

  const placeholders = ids.map(() => '?').join(', ');

  const [rows] = await connection.query(
    `
      SELECT
        id,
        item_code,
        item_name,
        item_kind,
        is_active
      FROM items
      WHERE id IN (${placeholders})
    `,
    ids
  );

  return rows;
}

async function findLastBarcodeByYear(yearTwoDigits, connection = db) {
  const prefix = `68${yearTwoDigits}`;

  const [rows] = await connection.query(
    `
      SELECT item_code
      FROM items
      WHERE item_code LIKE ?
        AND item_code REGEXP ?
      ORDER BY CAST(SUBSTRING(item_code, 5) AS UNSIGNED) DESC
      LIMIT 1
      FOR UPDATE
    `,
    [`${prefix}%`, `^${prefix}[0-9]{8}$`]
  );

  return rows[0]?.item_code || null;
}

async function create(data, connection = db) {
  await connection.query(
    `
      INSERT INTO items (
        id,
        item_code,
        barcode,
        item_name,
        item_kind,
        parent_id,
        uom_id,
        sku_status_id,
        business_unit_id,
        variant,
        qty_per_pack,
        height,
        width,
        depth,
        gross_weight_pack,
        container_20ft_qty,
        container_40hq_qty,
        production_time_days,
        is_active,
        created_by,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.id,
      data.item_code,
      data.barcode,
      data.item_name,
      data.item_kind,
      data.parent_id,
      data.uom_id || null,
      data.sku_status_id || null,
      data.business_unit_id,
      data.variant || null,
      data.qty_per_pack ?? null,
      data.height ?? null,
      data.width ?? null,
      data.depth ?? null,
      data.gross_weight_pack ?? null,
      data.container_20ft_qty ?? null,
      data.container_40hq_qty ?? null,
      data.production_time_days ?? null,
      data.is_active ?? 1,
      data.created_by || null,
      data.updated_by || null,
    ]
  );

  return findById(data.id, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `
      UPDATE items
      SET
        item_name = ?,
        item_kind = ?,
        parent_id = ?,
        uom_id = ?,
        sku_status_id = ?,
        business_unit_id = ?,
        variant = ?,
        qty_per_pack = ?,
        height = ?,
        width = ?,
        depth = ?,
        gross_weight_pack = ?,
        container_20ft_qty = ?,
        container_40hq_qty = ?,
        production_time_days = ?,
        is_active = ?,
        updated_by = ?
      WHERE id = ?
    `,
    [
      data.item_name,
      data.item_kind,
      data.parent_id,
      data.uom_id || null,
      data.sku_status_id || null,
      data.business_unit_id,
      data.variant || null,
      data.qty_per_pack ?? null,
      data.height ?? null,
      data.width ?? null,
      data.depth ?? null,
      data.gross_weight_pack ?? null,
      data.container_20ft_qty ?? null,
      data.container_40hq_qty ?? null,
      data.production_time_days ?? null,
      data.is_active,
      data.updated_by || null,
      id,
    ]
  );

  return findById(id, connection);
}

async function replaceChannels(itemId, channels = [], connection = db) {
  await connection.query(
    `
      DELETE FROM item_channels
      WHERE item_id = ?
    `,
    [itemId]
  );

  if (!channels.length) return [];

  const values = channels.map((channel) => [
    crypto.randomUUID(),
    itemId,
    channel.business_unit_id,
    Number(channel.department_id),
    channel.channel_name || null,
    channel.channel_code || null,
    channel.is_primary ?? 0,
    channel.is_active ?? 1,
  ]);

  await connection.query(
    `
      INSERT INTO item_channels (
        id,
        item_id,
        business_unit_id,
        department_id,
        channel_name,
        channel_code,
        is_primary,
        is_active
      )
      VALUES ?
    `,
    [values]
  );

  const grouped = await findChannelsByItemIds([itemId], connection);

  return grouped[itemId] || [];
}

async function replaceComponents(bundleItemId, components = [], connection = db) {
  await connection.query(
    `
      DELETE FROM item_bundle_components
      WHERE bundle_item_id = ?
    `,
    [bundleItemId]
  );

  if (!components.length) return [];

  const values = components.map((component, index) => [
    crypto.randomUUID(),
    bundleItemId,
    component.component_item_id,
    component.qty,
    component.sort_order || index + 1,
  ]);

  await connection.query(
    `
      INSERT INTO item_bundle_components (
        id,
        bundle_item_id,
        component_item_id,
        qty,
        sort_order
      )
      VALUES ?
    `,
    [values]
  );

  const grouped = await findComponentsByBundleItemIds([bundleItemId], connection);

  return grouped[bundleItemId] || [];
}

async function deleteComponents(bundleItemId, connection = db) {
  await connection.query(
    `
      DELETE FROM item_bundle_components
      WHERE bundle_item_id = ?
    `,
    [bundleItemId]
  );
}

async function findChannelsByItemIds(itemIds = [], connection = db) {
  if (!itemIds.length) return {};

  const placeholders = itemIds.map(() => '?').join(', ');

  const [rows] = await connection.query(
    `
      SELECT
        id,
        item_id,
        business_unit_id,
        department_id,
        channel_name,
        channel_code,
        is_primary,
        is_active,
        created_at,
        updated_at
      FROM item_channels
      WHERE item_id IN (${placeholders})
      ORDER BY is_primary DESC, created_at ASC
    `,
    itemIds
  );

  const grouped = {};

  rows.forEach((row) => {
    if (!grouped[row.item_id]) {
      grouped[row.item_id] = [];
    }

    grouped[row.item_id].push({
      id: row.id,
      business_unit_id: row.business_unit_id,
      business_unit_code: null,
      business_unit_name: null,
      department_id: row.department_id,
      department_code: null,
      department_name: null,
      channel_name: row.channel_name,
      channel_code: row.channel_code,
      is_primary: row.is_primary,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  });

  return grouped;
}

async function findComponentsByBundleItemIds(bundleItemIds = [], connection = db) {
  if (!bundleItemIds.length) return {};

  const placeholders = bundleItemIds.map(() => '?').join(', ');

  const [rows] = await connection.query(
    `
      SELECT
        ibc.id,
        ibc.bundle_item_id,
        ibc.component_item_id,
        ibc.qty,
        ibc.sort_order,
        ibc.created_at,
        ibc.updated_at,
        i.item_code AS component_item_code,
        i.item_name AS component_item_name,
        i.item_kind AS component_item_kind
      FROM item_bundle_components ibc
      INNER JOIN items i ON i.id = ibc.component_item_id
      WHERE ibc.bundle_item_id IN (${placeholders})
      ORDER BY ibc.sort_order ASC, ibc.created_at ASC
    `,
    bundleItemIds
  );

  const grouped = {};

  rows.forEach((row) => {
    if (!grouped[row.bundle_item_id]) {
      grouped[row.bundle_item_id] = [];
    }

    grouped[row.bundle_item_id].push({
      id: row.id,
      qty: row.qty,
      sort_order: row.sort_order,
      item: {
        id: row.component_item_id,
        item_code: row.component_item_code,
        item_name: row.component_item_name,
        item_kind: row.component_item_kind,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  });

  return grouped;
}

async function findBusinessUnitsByIds(ids = []) {
  if (!ids.length) return [];

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const placeholders = uniqueIds.map(() => '?').join(', ');

  const [rows] = await centralDb.query(
    `
      SELECT
        id,
        code,
        name,
        is_active
      FROM master_business_units
      WHERE id IN (${placeholders})
    `,
    uniqueIds
  );

  return rows;
}

async function findBusinessUnitById(id) {
  if (!id) return null;

  const [rows] = await centralDb.query(
    `
      SELECT
        id,
        code,
        name,
        is_active
      FROM master_business_units
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findDepartmentsByIds(ids = []) {
  if (!ids.length) return [];

  const uniqueIds = [...new Set(ids.filter((id) => id !== undefined && id !== null))];
  if (!uniqueIds.length) return [];

  const placeholders = uniqueIds.map(() => '?').join(', ');

  const [rows] = await centralDb.query(
    `
      SELECT
        id,
        code,
        name,
        class
      FROM master_departments
      WHERE id IN (${placeholders})
    `,
    uniqueIds
  );

  return rows;
}

async function findBusinessUnitDepartmentPair(businessUnitId, departmentId) {
  const [rows] = await centralDb.query(
    `
      SELECT
        id,
        business_unit_id,
        department_id,
        is_active
      FROM master_business_unit_departments
      WHERE business_unit_id = ?
        AND department_id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [businessUnitId, departmentId]
  );

  return rows[0] || null;
}

async function enrichItems(items = []) {
  if (!items.length) return items;

  const businessUnitIds = [];
  const departmentIds = [];

  items.forEach((item) => {
    if (item.business_unit?.id) {
      businessUnitIds.push(item.business_unit.id);
    }

    item.channels.forEach((channel) => {
      if (channel.business_unit_id) {
        businessUnitIds.push(channel.business_unit_id);
      }

      if (channel.department_id !== undefined && channel.department_id !== null) {
        departmentIds.push(channel.department_id);
      }
    });
  });

  const businessUnits = await findBusinessUnitsByIds(businessUnitIds);
  const departments = await findDepartmentsByIds(departmentIds);

  const businessUnitMap = new Map(businessUnits.map((row) => [row.id, row]));
  const departmentMap = new Map(departments.map((row) => [Number(row.id), row]));

  items.forEach((item) => {
    const businessUnit = businessUnitMap.get(item.business_unit?.id);

    if (businessUnit) {
      item.business_unit = {
        id: businessUnit.id,
        code: businessUnit.code,
        name: businessUnit.name,
      };
    }

    item.channels = item.channels.map((channel) => {
      const channelBusinessUnit = businessUnitMap.get(channel.business_unit_id);
      const department = departmentMap.get(Number(channel.department_id));

      return {
        ...channel,
        business_unit_code: channelBusinessUnit?.code || null,
        business_unit_name: channelBusinessUnit?.name || null,
        department_code: department?.code || null,
        department_name: department?.name || null,
      };
    });
  });

  return items;
}

async function transaction(callback) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const result = await callback(connection);

    await connection.commit();

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  findAll,
  findById,
  findRawById,
  findParentById,
  findUomById,
  findSkuStatusById,
  findItemsByIds,
  findLastBarcodeByYear,
  create,
  update,
  replaceChannels,
  replaceComponents,
  deleteComponents,
  findBusinessUnitById,
  findBusinessUnitDepartmentPair,
  transaction,
};