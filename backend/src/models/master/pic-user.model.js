const crypto = require('crypto');
const { db, centralDb } = require('../../config/database.config');

const table = 'master_pic_users';
const PRODUCT_DEPARTMENT_ID = 13;

async function findAll({
  search,
  pic_id,
  central_user_id,
  is_primary,
  is_active,
} = {}) {
  const params = [];

  let sql = `
    SELECT
      mpu.id,
      mpu.pic_id,
      mp.code AS pic_code,
      mp.name AS pic_name,
      mpu.central_user_id,
      mpu.is_primary,
      mpu.is_active,
      mpu.created_at,
      mpu.updated_at
    FROM ${table} mpu
    LEFT JOIN master_pics mp ON mp.id = mpu.pic_id
    WHERE 1 = 1
  `;

  if (search) {
    sql += `
      AND (
        mpu.central_user_id LIKE ?
        OR mp.code LIKE ?
        OR mp.name LIKE ?
      )
    `;
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  if (pic_id) {
    sql += ` AND mpu.pic_id = ?`;
    params.push(pic_id);
  }

  if (central_user_id) {
    sql += ` AND mpu.central_user_id = ?`;
    params.push(central_user_id);
  }

  if (is_primary !== undefined && is_primary !== '') {
    sql += ` AND mpu.is_primary = ?`;
    params.push(Number(is_primary));
  }

  if (is_active !== undefined && is_active !== '') {
    sql += ` AND mpu.is_active = ?`;
    params.push(Number(is_active));
  }

  sql += ` ORDER BY mp.name ASC, mpu.created_at ASC`;

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `
      SELECT
        mpu.id,
        mpu.pic_id,
        mp.code AS pic_code,
        mp.name AS pic_name,
        mpu.central_user_id,
        mpu.is_primary,
        mpu.is_active,
        mpu.created_at,
        mpu.updated_at
      FROM ${table} mpu
      LEFT JOIN master_pics mp ON mp.id = mpu.pic_id
      WHERE mpu.id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findByPicId(picId) {
  const [rows] = await db.query(
    `
      SELECT
        mpu.id,
        mpu.pic_id,
        mp.code AS pic_code,
        mp.name AS pic_name,
        mpu.central_user_id,
        mpu.is_primary,
        mpu.is_active,
        mpu.created_at,
        mpu.updated_at
      FROM ${table} mpu
      LEFT JOIN master_pics mp ON mp.id = mpu.pic_id
      WHERE mpu.pic_id = ?
      ORDER BY mpu.is_primary DESC, mpu.created_at ASC
    `,
    [picId]
  );

  return rows;
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

async function findCentralUserById(centralUserId) {
  const [rows] = await centralDb.query(
    `
      SELECT
        id
      FROM central_users
      WHERE id = ?
      LIMIT 1
    `,
    [centralUserId]
  );

  return rows[0] || null;
}

async function findCentralUsersByIds(centralUserIds = []) {
  if (!centralUserIds.length) {
    return [];
  }

  const placeholders = centralUserIds.map(() => '?').join(', ');

  const [rows] = await centralDb.query(
    `
      SELECT
        id
      FROM central_users
      WHERE id IN (${placeholders})
    `,
    centralUserIds
  );

  return rows;
}

async function findActivePics() {
  const [rows] = await db.query(
    `
      SELECT
        id,
        code,
        name,
        is_active
      FROM master_pics
      WHERE is_active = 1
      ORDER BY name ASC
    `
  );

  return rows;
}

async function findCentralUsersByDepartment({
  active = 1,
  search,
} = {}) {
  const params = [PRODUCT_DEPARTMENT_ID];

  let sql = `
    SELECT
      cu.id,
      cu.internal_id,
      cu.username,
      cu.email,
      cu.phone,
      cu.name,
      cu.job_position,
      cu.job_level_id,
      cu.is_active,
      md.id AS department_id,
      md.name AS department_name,
      md.class AS department_class,
      md.code AS department_code,
      md.company_id,
      cud.is_primary
    FROM central_users cu
    LEFT JOIN central_user_departments cud ON cud.user_id = cu.id
    LEFT JOIN master_departments md ON md.id = cud.department_id
    WHERE md.id = ?
  `;

  if (active !== null && active !== undefined && active !== 'all') {
    sql += ` AND cu.is_active = ?`;
    params.push(Number(active));
  }

  if (search) {
    sql += `
      AND (
        cu.name LIKE ?
        OR cu.username LIKE ?
        OR cu.email LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY cu.name ASC`;

  const [rows] = await centralDb.query(sql, params);
  return rows;
}

async function create(data) {
  const id = crypto.randomUUID();

  await db.query(
    `
      INSERT INTO ${table} (
        id,
        pic_id,
        central_user_id,
        is_primary,
        is_active
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
    [
      id,
      data.pic_id,
      data.central_user_id,
      data.is_primary,
      data.is_active,
    ]
  );

  return id;
}

async function createMany(picId, users = []) {
  if (!users.length) {
    return [];
  }

  const values = users.map((user) => [
    crypto.randomUUID(),
    picId,
    user.central_user_id,
    user.is_primary,
    user.is_active,
  ]);

  await db.query(
    `
      INSERT INTO ${table} (
        id,
        pic_id,
        central_user_id,
        is_primary,
        is_active
      ) VALUES ?
    `,
    [values]
  );

  return findByPicId(picId);
}

async function update(id, data) {
  const [result] = await db.query(
    `
      UPDATE ${table}
      SET
        pic_id = ?,
        central_user_id = ?,
        is_primary = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.pic_id,
      data.central_user_id,
      data.is_primary,
      data.is_active,
      id,
    ]
  );

  return result;
}

async function syncByPicId(picId, users = []) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      `
        SELECT
          id,
          pic_id,
          central_user_id,
          is_primary,
          is_active
        FROM ${table}
        WHERE pic_id = ?
      `,
      [picId]
    );

    const incomingMap = new Map(
      users.map((user) => [user.central_user_id, user])
    );

    const existingMap = new Map(
      existingRows.map((row) => [row.central_user_id, row])
    );

    const usersToDelete = existingRows.filter(
      (row) => !incomingMap.has(row.central_user_id)
    );

    for (const row of usersToDelete) {
      await conn.query(
        `
          DELETE FROM ${table}
          WHERE id = ?
        `,
        [row.id]
      );
    }

    for (const user of users) {
      const existing = existingMap.get(user.central_user_id);

      if (!existing) {
        await conn.query(
          `
            INSERT INTO ${table} (
              id,
              pic_id,
              central_user_id,
              is_primary,
              is_active
            ) VALUES (
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `,
          [
            crypto.randomUUID(),
            picId,
            user.central_user_id,
            user.is_primary,
            user.is_active,
          ]
        );

        continue;
      }

      const shouldUpdate = Number(existing.is_primary) !== Number(user.is_primary)
        || Number(existing.is_active) !== Number(user.is_active);

      if (shouldUpdate) {
        await conn.query(
          `
            UPDATE ${table}
            SET
              is_primary = ?,
              is_active = ?,
              updated_at = NOW()
            WHERE id = ?
          `,
          [
            user.is_primary,
            user.is_active,
            existing.id,
          ]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return findByPicId(picId);
}

async function remove(id) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
        SELECT
          id,
          pic_id,
          is_primary
        FROM ${table}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    const deletedRow = rows[0] || null;

    if (!deletedRow) {
      await conn.rollback();
      return null;
    }

    await conn.query(
      `
        DELETE FROM ${table}
        WHERE id = ?
      `,
      [id]
    );

    if (Number(deletedRow.is_primary) === 1) {
      const [remainingRows] = await conn.query(
        `
          SELECT
            id
          FROM ${table}
          WHERE pic_id = ?
            AND is_active = 1
          ORDER BY created_at ASC
          LIMIT 1
        `,
        [deletedRow.pic_id]
      );

      const nextPrimary = remainingRows[0] || null;

      if (nextPrimary) {
        await conn.query(
          `
            UPDATE ${table}
            SET
              is_primary = 1,
              updated_at = NOW()
            WHERE id = ?
          `,
          [nextPrimary.id]
        );
      }
    }

    await conn.commit();

    return {
      deleted_id: id,
      pic_id: deletedRow.pic_id,
      was_primary: Number(deletedRow.is_primary) === 1,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
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
  findByPicId,
  findPicById,
  findCentralUserById,
  findCentralUsersByIds,
  findActivePics,
  findCentralUsersByDepartment,
  create,
  createMany,
  update,
  updateStatus,
  syncByPicId,
  remove,
};