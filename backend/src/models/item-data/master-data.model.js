const crypto = require('crypto');
const { db } = require('../../config/database.config');

async function many(sql, params = [], connection = db) { return (await connection.query(sql, params))[0]; }
async function one(sql, params = [], connection = db) { return (await connection.query(sql, params))[0][0] || null; }

const CONFIG = {
  brands: { table: 'master_brands', pivot: 'code', fields: ['code','name','is_active'], order: 'name' },
  categories: { table: 'master_categories', pivot: 'detail_category', fields: ['detail_category','sub_category','main_category','brand_category','is_active'], order: 'detail_category' },
  'item-sources': { table: 'master_item_types', pivot: 'code', fields: ['code','name','is_active'], order: 'name' },
  ports: { table: 'master_ports', pivot: 'code', fields: ['country_code','code','name','is_active'], order: 'country_code,name' },
  uoms: { table: 'master_uoms', pivot: 'code', fields: ['code','name','is_active'], order: 'name' },
  'variant-attributes': { table: 'master_variant_attributes', pivot: 'code', fields: ['code','name','is_active'], order: 'name' },
  'sub-brands': { table: 'master_subbrands', pivot: 'name', fields: ['name','normalized_name','is_active'], order: 'name' },
};

function config(type) {
  const value = CONFIG[type];
  if (!value) throw Object.assign(new Error('Unsupported master type'), { statusCode: 422 });
  return value;
}

async function exportRows(type, status = null) {
  if (type === 'variant-values') {
    const params = [];
    let where = '';
    if (status !== null) { where = 'WHERE mv.is_active=?'; params.push(status === 'active' ? 1 : 0); }
    return many(`SELECT ma.code attribute_code,mv.code value_code,mv.name value_name,mv.is_active FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id ${where} ORDER BY ma.code,mv.sort_order,mv.name`, params);
  }
  const c = config(type);
  const params = [];
  let where = '';
  if (status !== null) { where = 'WHERE is_active=?'; params.push(status === 'active' ? 1 : 0); }
  return many(`SELECT ${c.fields.join(',')} FROM ${c.table} ${where} ORDER BY ${c.order}`, params);
}

async function findByPivot(type, pivotValue, secondaryValue = null, connection = db) {
  if (type === 'variant-values') {
    return one(`SELECT mv.*,ma.code attribute_code FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id WHERE ma.code=? AND mv.code=? LIMIT 1`, [pivotValue, secondaryValue], connection);
  }
  const c = config(type);
  return one(`SELECT * FROM ${c.table} WHERE ${c.pivot}=? LIMIT 1`, [pivotValue], connection);
}

async function findVariantAttributeByCode(code, connection = db) {
  return one('SELECT * FROM master_variant_attributes WHERE code=? LIMIT 1', [code], connection);
}

async function create(type, fields, connection = db) {
  if (type === 'variant-values') {
    const id = crypto.randomUUID();
    const [sortRow] = await connection.query('SELECT COALESCE(MAX(sort_order),0)+1 next_sort FROM master_variant_values WHERE attribute_id=?', [fields.attribute_id]);
    await connection.query('INSERT INTO master_variant_values (id,attribute_id,code,name,sort_order,is_active) VALUES (?,?,?,?,?,?)', [id,fields.attribute_id,fields.value_code,fields.value_name,Number(sortRow[0]?.next_sort || 1),fields.is_active]);
    return id;
  }
  const c = config(type);
  const id = crypto.randomUUID();
  const keys = c.fields.filter((key) => Object.prototype.hasOwnProperty.call(fields, key));
  await connection.query(`INSERT INTO ${c.table} (id,${keys.join(',')}) VALUES (?,${keys.map(() => '?').join(',')})`, [id, ...keys.map((k) => fields[k])]);
  return id;
}

async function update(type, id, fields, connection = db) {
  if (type === 'variant-values') {
    const mapping = { attribute_id: 'attribute_id', value_code: 'code', value_name: 'name', is_active: 'is_active' };
    const keys = Object.keys(mapping).filter((key) => Object.prototype.hasOwnProperty.call(fields, key));
    if (!keys.length) return;
    await connection.query(`UPDATE master_variant_values SET ${keys.map((key) => `${mapping[key]}=?`).join(',')},updated_at=NOW() WHERE id=?`, [...keys.map((key) => fields[key]), id]);
    return;
  }
  const c = config(type);
  const keys = c.fields.filter((key) => Object.prototype.hasOwnProperty.call(fields, key));
  if (!keys.length) return;
  await connection.query(`UPDATE ${c.table} SET ${keys.map((k) => `${k}=?`).join(',')},updated_at=NOW() WHERE id=?`, [...keys.map((k) => fields[k]), id]);
}

async function transaction(callback) {
  const connection = await db.getConnection();
  try { await connection.beginTransaction(); const result = await callback(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { exportRows, findByPivot, findVariantAttributeByCode, create, update, transaction };
