const crypto = require('crypto');
const { db } = require('../../config/database.config');

const table = 'master_categories';

async function findAll({
  search,
  pic_id,
  main_category,
  sub_category,
  brand_category,
  is_active,
} = {}) {
  const params = [];

  let sql = `
    SELECT
      mc.id,
      mc.detail_category,
      mc.sub_category,
      mc.main_category,
      mc.brand_category,
      mc.pic_id,
      mp.code AS pic_code,
      mp.name AS pic_name,
      mc.is_active,
      mc.created_at,
      mc.updated_at
    FROM ${table} mc
    LEFT JOIN master_pics mp ON mp.id = mc.pic_id
    WHERE 1 = 1
  `;

  if (search) {
    sql += `
      AND (
        mc.detail_category LIKE ?
        OR mc.sub_category LIKE ?
        OR mc.main_category LIKE ?
        OR mc.brand_category LIKE ?
        OR mp.code LIKE ?
        OR mp.name LIKE ?
      )
    `;
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  if (pic_id) {
    sql += ` AND mc.pic_id = ?`;
    params.push(pic_id);
  }

  if (main_category) {
    sql += ` AND mc.main_category = ?`;
    params.push(main_category);
  }

  if (sub_category) {
    sql += ` AND mc.sub_category = ?`;
    params.push(sub_category);
  }

  if (brand_category) {
    sql += ` AND mc.brand_category = ?`;
    params.push(brand_category);
  }

  if (is_active !== undefined && is_active !== '') {
    sql += ` AND mc.is_active = ?`;
    params.push(Number(is_active));
  }

  sql += ` ORDER BY mc.detail_category ASC`;

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `
      SELECT
        mc.id,
        mc.detail_category,
        mc.sub_category,
        mc.main_category,
        mc.brand_category,
        mc.pic_id,
        mp.code AS pic_code,
        mp.name AS pic_name,
        mc.is_active,
        mc.created_at,
        mc.updated_at
      FROM ${table} mc
      LEFT JOIN master_pics mp ON mp.id = mc.pic_id
      WHERE mc.id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findPicById(picId) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        code,
        name,
        is_active
      FROM master_pics
      WHERE id = ?
      LIMIT 1
    `,
    [picId]
  );

  return rows[0] || null;
}

async function create(data) {
  const id = crypto.randomUUID();

  await db.query(
    `
      INSERT INTO ${table} (
        id,
        detail_category,
        sub_category,
        main_category,
        brand_category,
        pic_id,
        is_active
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
    [
      id,
      data.detail_category,
      data.sub_category,
      data.main_category,
      data.brand_category,
      data.pic_id,
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
        detail_category = ?,
        sub_category = ?,
        main_category = ?,
        brand_category = ?,
        pic_id = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.detail_category,
      data.sub_category,
      data.main_category,
      data.brand_category,
      data.pic_id,
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

module.exports = {
  findAll,
  findById,
  findPicById,
  create,
  update,
  remove,
};