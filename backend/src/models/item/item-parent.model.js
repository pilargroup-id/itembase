const { db } = require('../../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
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
      search
    );
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

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function baseSelectSql() {
  return `
    SELECT
      ip.id,
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
    INNER JOIN master_brands mb ON mb.id = ip.brand_id
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
    sub_brand: row.sub_brand,
    item_name: row.item_name,
    parent_name: row.parent_name,
    status: row.status,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    brand: {
      id: row.brand_id,
      code: row.brand_code,
      name: row.brand_name,
    },
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

  const sql = `
    ${baseSelectSql()}
    ${whereSql}
    ORDER BY ip.created_at DESC, ip.parent_code DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM item_parents ip
    INNER JOIN master_brands mb ON mb.id = ip.brand_id
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.id,
      data.parent_code,
      data.brand_id,
      data.sub_brand || null,
      data.item_name,
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
      data.brand_id,
      data.sub_brand || null,
      data.item_name,
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
  transaction,
};