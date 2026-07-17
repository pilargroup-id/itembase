const crypto = require('crypto');
const { db } = require('../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function safeParseJson(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringifyJson(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

function buildWhereClause(query = {}, { includeSearch = true } = {}) {
  const conditions = [];
  const params = [];

  if (includeSearch && query.search) {
    const search = `%${query.search}%`;

    conditions.push(`
      (
        al.description LIKE ?
        OR al.entity_type LIKE ?
        OR al.entity_id LIKE ?
        OR al.action LIKE ?
      )
    `);

    params.push(search, search, search, search);
  }

  if (query.user_id) {
    conditions.push('al.user_id = ?');
    params.push(query.user_id);
  }

  if (query.action) {
    conditions.push('al.action = ?');
    params.push(query.action);
  }

  if (query.entity_type) {
    conditions.push('al.entity_type = ?');
    params.push(query.entity_type);
  }

  if (query.entity_id) {
    conditions.push('al.entity_id = ?');
    params.push(query.entity_id);
  }

  if (query.date_from) {
    conditions.push('DATE(al.created_at) >= ?');
    params.push(query.date_from);
  }

  if (query.date_to) {
    conditions.push('DATE(al.created_at) <= ?');
    params.push(query.date_to);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    user: null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    description: row.description,
    before_data: safeParseJson(row.before_data),
    after_data: safeParseJson(row.after_data),
    metadata: safeParseJson(row.metadata),
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  };
}

function baseSelectSql() {
  return `
    SELECT
      al.id,
      al.user_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.description,
      al.before_data,
      al.after_data,
      al.metadata,
      al.ip_address,
      al.user_agent,
      al.created_at
    FROM activity_logs al
  `;
}

async function findAll(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, params } = buildWhereClause(query);

  const sql = `
    ${baseSelectSql()}
    ${whereSql}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM activity_logs al
    ${whereSql}
  `;

  const [rows] = await db.query(sql, [...params, limit, offset]);
  const [countRows] = await db.query(countSql, params);
  const total = Number(countRows[0]?.total || 0);

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

async function findAllForSearch(query = {}) {
  const { whereSql, params } = buildWhereClause(query, { includeSearch: false });

  const [rows] = await db.query(
    `
      ${baseSelectSql()}
      ${whereSql}
      ORDER BY al.created_at DESC
    `,
    params
  );

  return rows.map(mapRow);
}

async function findById(id) {
  const [rows] = await db.query(
    `
      ${baseSelectSql()}
      WHERE al.id = ?
      LIMIT 1
    `,
    [id]
  );

  return mapRow(rows[0]);
}

async function create(data, connection = db) {
  const id = crypto.randomUUID();

  await connection.query(
    `
      INSERT INTO activity_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        before_data,
        after_data,
        metadata,
        ip_address,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      data.user_id || null,
      data.action,
      data.entity_type,
      data.entity_id || null,
      data.description || null,
      stringifyJson(data.before_data),
      stringifyJson(data.after_data),
      stringifyJson(data.metadata),
      data.ip_address || null,
      data.user_agent || null,
    ]
  );

  return id;
}

module.exports = {
  findAll,
  findAllForSearch,
  findById,
  create,
};
