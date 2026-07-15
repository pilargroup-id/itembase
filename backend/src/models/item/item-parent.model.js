const crypto = require('crypto');
const { db } = require('../../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 250);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function buildOrderByClause(sort = '') {
  const sortMap = {
    'date-desc': 'ip.created_at DESC, ip.parent_code DESC',
    'date-asc': 'ip.created_at ASC, ip.parent_code ASC',
    'code-desc': 'ip.parent_code DESC',
    'code-asc': 'ip.parent_code ASC',
    'name-desc': 'ip.parent_name DESC, ip.parent_code DESC',
    'name-asc': 'ip.parent_name ASC, ip.parent_code ASC',
  };

  return `ORDER BY ${sortMap[sort] || sortMap['date-desc']}`;
}

function buildWhereClause(query = {}) {
  const conditions = [];
  const params = [];

  if (query.search) {
    const search = `%${query.search}%`;

    conditions.push(`
      (
        ip.parent_code LIKE ?
        OR ip.item_name LIKE ?
        OR ip.parent_name LIKE ?
        OR ip.sub_brand LIKE ?
        OR ms.name LIKE ?
        OR mb.code LIKE ?
        OR mb.name LIKE ?
        OR mc.detail_category LIKE ?
        OR mc.sub_category LIKE ?
        OR mc.main_category LIKE ?
        OR mc.brand_category LIKE ?
        OR mit.code LIKE ?
        OR mit.name LIKE ?
        OR mp.code LIKE ?
        OR mp.name LIKE ?
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
      search
    );
  }

  if (query.status) {
    conditions.push('ip.status = ?');
    params.push(query.status);
  }

  if (query.main_category) {
    conditions.push('mc.main_category = ?');
    params.push(query.main_category);
  }

  if (query.sub_category) {
    conditions.push('mc.sub_category = ?');
    params.push(query.sub_category);
  }

  if (query.detail_category) {
    conditions.push('mc.detail_category = ?');
    params.push(query.detail_category);
  }

  if (query.brand_category) {
    conditions.push('mc.brand_category = ?');
    params.push(query.brand_category);
  }

  if (query.brand_name) {
    conditions.push('mb.name = ?');
    params.push(query.brand_name);
  }

  if (query.sub_brand) {
    conditions.push('ip.sub_brand = ?');
    params.push(query.sub_brand);
  }

  if (query.subbrand_id) {
    conditions.push('ip.subbrand_id = ?');
    params.push(query.subbrand_id);
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

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function baseSelectSql() {
  return `
    SELECT
      ip.id,
      ip.subbrand_id,
      ip.parent_code,
      ip.brand_id,
      ip.sub_brand,
      ip.item_name,
      ip.category_id,
      ip.item_type_id,
      ip.port_id,
      ip.parent_name,
      ip.status,
      ip.created_by,
      ip.updated_by,
      ip.created_at,
      ip.updated_at,

      ms.name AS subbrand_name,
      ms.normalized_name AS subbrand_normalized_name,
      ms.is_active AS subbrand_is_active,

      mb.code AS brand_code,
      mb.name AS brand_name,

      mc.detail_category AS category_detail_category,
      mc.sub_category AS category_sub_category,
      mc.main_category AS category_main_category,
      mc.brand_category AS category_brand_category,
      mc.pic_id AS category_pic_id,

      mit.code AS item_type_code,
      mit.name AS item_type_name,

      mp.code AS port_code,
      mp.name AS port_name
    FROM item_parents ip
    LEFT JOIN master_subbrands ms ON ms.id = ip.subbrand_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    INNER JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_ports mp ON mp.id = ip.port_id
  `;
}

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    parent_code: row.parent_code,
    subbrand_id: row.subbrand_id,
    sub_brand: row.sub_brand,
    item_name: row.item_name,
    parent_name: row.parent_name,
    status: row.status,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    subbrand: row.subbrand_id
      ? {
          id: row.subbrand_id,
          name: row.subbrand_name,
          normalized_name: row.subbrand_normalized_name,
          is_active: row.subbrand_is_active,
        }
      : null,
    brand: row.brand_id
      ? {
          id: row.brand_id,
          code: row.brand_code,
          name: row.brand_name,
        }
      : null,
    category: {
      id: row.category_id,
      detail_category: row.category_detail_category,
      sub_category: row.category_sub_category,
      main_category: row.category_main_category,
      brand_category: row.category_brand_category,
      pic_id: row.category_pic_id,
    },
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
  };
}

async function findAll(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, params } = buildWhereClause(query);
  const orderBySql = buildOrderByClause(query.sort);

  const sql = `
    ${baseSelectSql()}
    ${whereSql}
    ${orderBySql}
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM item_parents ip
    LEFT JOIN master_subbrands ms ON ms.id = ip.subbrand_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    INNER JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_ports mp ON mp.id = ip.port_id
    ${whereSql}
  `;

  const [rows] = await db.query(sql, [...params, limit, offset]);
  const [countRows] = await db.query(countSql, params);

  const total = countRows[0]?.total || 0;

  return {
    data: rows.map(mapRow),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total_page: Math.ceil(total / limit),
    },
  };
}

async function findById(id, connection = db) {
  const sql = `
    ${baseSelectSql()}
    WHERE ip.id = ?
    LIMIT 1
  `;

  const [rows] = await connection.query(sql, [id]);

  return mapRow(rows[0]);
}

async function findRawById(id, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM item_parents
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findLastParentCode(connection = db) {
  const [rows] = await connection.query(`
    SELECT parent_code
    FROM item_parents
    WHERE parent_code REGEXP '^P[0-9]{6}$'
    ORDER BY CAST(SUBSTRING(parent_code, 2) AS UNSIGNED) DESC
    LIMIT 1
  `);

  return rows[0]?.parent_code || null;
}

async function create(data, connection = db) {
  await connection.query(
    `
      INSERT INTO item_parents (
        id,
        subbrand_id,
        parent_code,
        brand_id,
        sub_brand,
        item_name,
        category_id,
        item_type_id,
        port_id,
        parent_name,
        status,
        created_by,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.id,
      data.subbrand_id || null,
      data.parent_code,
      data.brand_id || null,
      data.sub_brand || null,
      data.item_name || null,
      data.category_id,
      data.item_type_id || null,
      data.port_id || null,
      data.parent_name,
      data.status || 'active',
      data.created_by || null,
      data.updated_by || null,
    ]
  );

  return findById(data.id, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `
      UPDATE item_parents
      SET
        subbrand_id = ?,
        brand_id = ?,
        sub_brand = ?,
        item_name = ?,
        category_id = ?,
        item_type_id = ?,
        port_id = ?,
        parent_name = ?,
        status = ?,
        updated_by = ?
      WHERE id = ?
    `,
    [
      data.subbrand_id || null,
      data.brand_id || null,
      data.sub_brand || null,
      data.item_name || null,
      data.category_id,
      data.item_type_id || null,
      data.port_id || null,
      data.parent_name,
      data.status,
      data.updated_by || null,
      id,
    ]
  );

  return findById(id, connection);
}

async function deactivateChildItems(parentId, connection = db) {
  await connection.query(
    `
      UPDATE items
      SET is_active = 0
      WHERE parent_id = ?
    `,
    [parentId]
  );
}

async function existsInTable(tableName, id, connection = db) {
  const allowedTables = [
    'master_subbrands',
    'master_brands',
    'master_categories',
    'master_item_types',
    'master_ports',
  ];

  if (!allowedTables.includes(tableName)) {
    throw new Error('Invalid reference table');
  }

  const [rows] = await connection.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows.length > 0;
}

async function findSubbrandById(id, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        name,
        normalized_name,
        is_active,
        created_at,
        updated_at
      FROM master_subbrands
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findSubbrandByName(name, connection = db) {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        name,
        normalized_name,
        is_active,
        created_at,
        updated_at
      FROM master_subbrands
      WHERE name = ?
      LIMIT 1
    `,
    [name]
  );

  return rows[0] || null;
}

async function createSubbrand(data, connection = db) {
  const id = crypto.randomUUID();

  await connection.query(
    `
      INSERT INTO master_subbrands (
        id,
        name,
        normalized_name,
        is_active
      )
      VALUES (?, ?, ?, 1)
    `,
    [
      id,
      data.name,
      data.normalized_name,
    ]
  );

  return findSubbrandById(id, connection);
}

async function upsertSubbrandItem(data, connection = db) {
  const id = crypto.randomUUID();

  await connection.query(
    `
      INSERT INTO master_subbrand_items (
        id,
        subbrand_id,
        item_parent_id,
        item_name,
        normalized_item_name,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        item_parent_id = VALUES(item_parent_id),
        normalized_item_name = VALUES(normalized_item_name),
        is_active = 1,
        updated_at = NOW()
    `,
    [
      id,
      data.subbrand_id,
      data.item_parent_id || null,
      data.item_name,
      data.normalized_item_name,
    ]
  );
}

async function findSubbrandSuggestionCandidates(connection = db) {
  const [rows] = await connection.query(
    `
      SELECT
        ms.id AS subbrand_id,
        ms.name AS sub_brand,
        msi.item_name AS parent_name
      FROM master_subbrand_items msi
      INNER JOIN master_subbrands ms ON ms.id = msi.subbrand_id
      WHERE ms.is_active = 1
        AND msi.is_active = 1
      ORDER BY ms.name ASC, msi.item_name ASC
    `
  );

  return rows;
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
  findLastParentCode,
  create,
  update,
  deactivateChildItems,
  existsInTable,
  findSubbrandById,
  findSubbrandByName,
  createSubbrand,
  upsertSubbrandItem,
  findSubbrandSuggestionCandidates,
  transaction,
};
