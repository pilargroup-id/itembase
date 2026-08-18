const { db } = require('../../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 20, 10), 1), 250);
  return { page, limit, offset: (page - 1) * limit };
}

function buildWhereClause(query = {}) {
  const conditions = ['i.is_active = 0'];
  const params = [];

  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    conditions.push(`(
      i.item_code LIKE ?
      OR i.item_name LIKE ?
      OR i.selling_name LIKE ?
      OR ip.parent_code LIKE ?
      OR ip.parent_name LIKE ?
    )`);
    params.push(search, search, search, search, search);
  }

  if (query.date_from) {
    conditions.push('DATE(inactive_log.inactive_date) >= ?');
    params.push(query.date_from);
  }

  if (query.date_to) {
    conditions.push('DATE(inactive_log.inactive_date) <= ?');
    params.push(query.date_to);
  }

  return {
    whereSql: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

function baseFromSql() {
  return `
    FROM items i
    LEFT JOIN item_parents ip ON ip.id = i.parent_id
    LEFT JOIN (
      SELECT
        al.entity_id AS item_id,
        MAX(al.created_at) AS inactive_date
      FROM activity_logs al
      WHERE al.entity_type = 'items'
        AND al.action = 'STATUS_CHANGE'
        AND JSON_VALID(al.after_data)
        AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(al.after_data, '$.is_active'))) IN ('0', 'false')
      GROUP BY al.entity_id
    ) inactive_log ON inactive_log.item_id = i.id
  `;
}

async function findInactiveItems(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, params } = buildWhereClause(query);

  const [rows] = await db.query(`
    SELECT
      i.id,
      i.item_code,
      i.item_name,
      i.selling_name,
      i.item_kind,
      i.is_active,
      i.created_at,
      i.updated_at,
      ip.id AS parent_id,
      ip.parent_code,
      ip.parent_name,
      inactive_log.inactive_date
    ${baseFromSql()}
    ${whereSql}
    ORDER BY inactive_log.inactive_date DESC, i.updated_at DESC, i.item_code ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    ${baseFromSql()}
    ${whereSql}
  `, params);

  const total = Number(countRows[0]?.total || 0);

  return {
    data: rows.map((row) => ({
      id: row.id,
      item_code: row.item_code,
      item_name: row.item_name,
      selling_name: row.selling_name,
      item_kind: row.item_kind,
      is_active: row.is_active,
      status: 'inactive',
      inactive_date: row.inactive_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      parent: row.parent_id
        ? {
            id: row.parent_id,
            parent_code: row.parent_code,
            parent_name: row.parent_name,
          }
        : null,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total_page: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  findInactiveItems,
};
