const crypto = require('crypto');
const { db } = require('../../config/database.config');

const table = 'master_sku_statuses';

async function findAll({ search, is_active } = {}) {
  const params = [];

  let sql = `
    SELECT
      id,
      code,
      name,
      is_active,
      created_at,
      updated_at
    FROM ${table}
    WHERE 1 = 1
  `;

  if (search) {
    sql += `
      AND (
        code LIKE ?
        OR name LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (is_active !== undefined && is_active !== '') {
    sql += ` AND is_active = ?`;
    params.push(Number(is_active));
  }

  sql += ` ORDER BY name ASC`;

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        code,
        name,
        is_active,
        created_at,
        updated_at
      FROM ${table}
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const id = crypto.randomUUID();

  await db.query(
    `
      INSERT INTO ${table} (
        id,
        code,
        name,
        is_active
      ) VALUES (
        ?,
        ?,
        ?,
        ?
      )
    `,
    [
      id,
      data.code,
      data.name,
      data.is_active,
    ]
  );

  return id;
}

async function update(id, data) {
  const [result] = await db.query(
    `
      UPDATE ${table}
      SET
        code = ?,
        name = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.code,
      data.name,
      data.is_active,
      id,
    ]
  );

  return result;
}

async function remove(id) {
  const [result] = await db.query(
    `
      DELETE FROM ${table}
      WHERE id = ?
    `,
    [id]
  );

  return result;
}

async function countUsedByItems(id) {
  const [rows] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM items
      WHERE sku_status_id = ?
    `,
    [id]
  );

  return rows[0]?.total || 0;
}

async function updateStatus(id, is_active) {
  const [result] = await db.query(
    `
      UPDATE ${table}
      SET
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [is_active, id]
  );

  return result;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  updateStatus,
  remove,
  countUsedByItems,
};