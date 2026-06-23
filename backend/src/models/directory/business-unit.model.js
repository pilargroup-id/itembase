const { centralDb } = require('../../config/database.config');

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

async function findAll({ active, is_active, search } = {}) {
  const params = [];
  const activeFilter = hasValue(active) ? active : is_active;

  let sql = `
    SELECT
      id,
      code,
      name,
      is_active
    FROM master_business_units
    WHERE 1 = 1
  `;

  if (hasValue(search)) {
    sql += `
      AND (
        code LIKE ?
        OR name LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (hasValue(activeFilter)) {
    sql += ` AND is_active = ?`;
    params.push(Number(activeFilter));
  }

  sql += ` ORDER BY name ASC`;

  const [rows] = await centralDb.query(sql, params);
  return rows;
}

async function findDepartmentsByBusinessUnitId(
  businessUnitId,
  { active, is_active, search } = {},
) {
  const params = [businessUnitId];
  const activeFilter = hasValue(active) ? active : is_active;

  let sql = `
    SELECT
      mbud.business_unit_id,
      md.id AS department_id,
      md.code AS department_code,
      md.name AS department_name,
      mbud.is_primary,
      mbud.is_active
    FROM master_business_unit_departments mbud
    INNER JOIN master_departments md ON md.id = mbud.department_id
    WHERE mbud.business_unit_id = ?
  `;

  if (hasValue(search)) {
    sql += `
      AND (
        md.code LIKE ?
        OR md.name LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (hasValue(activeFilter)) {
    sql += ` AND mbud.is_active = ?`;
    params.push(Number(activeFilter));
  }

  sql += `
    ORDER BY
      mbud.is_primary DESC,
      md.name ASC
  `;

  const [rows] = await centralDb.query(sql, params);
  return rows;
}

module.exports = {
  findAll,
  findDepartmentsByBusinessUnitId,
};
