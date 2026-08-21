const crypto = require('crypto');
const { db } = require('../../config/database.config');

async function one(sql, params = [], connection = db) {
  const [rows] = await connection.query(sql, params);
  return rows[0] || null;
}

async function many(sql, params = [], connection = db) {
  const [rows] = await connection.query(sql, params);
  return rows;
}

async function findParentByCode(code, connection = db) {
  return one('SELECT * FROM item_parents WHERE parent_code = ? LIMIT 1', [code], connection);
}

async function findItemByCode(code, connection = db) {
  return one('SELECT * FROM items WHERE item_code = ? LIMIT 1', [code], connection);
}

async function findLastParentCode(connection = db) {
  return one("SELECT parent_code FROM item_parents WHERE parent_code REGEXP '^P[0-9]{6}$' ORDER BY CAST(SUBSTRING(parent_code,2) AS UNSIGNED) DESC LIMIT 1", [], connection);
}

async function findByCode(table, code, connection = db) {
  const allowed = {
    brand: ['master_brands', 'code'],
    category: ['master_categories', 'detail_category'],
    item_type: ['master_item_types', 'code'],
    uom: ['master_uoms', 'code'],
    port: ['master_ports', 'code'],
    variant_attribute: ['master_variant_attributes', 'code'],
  };
  if (!allowed[table]) throw new Error('Invalid reference type');
  const [tableName, column] = allowed[table];
  return one(`SELECT * FROM ${tableName} WHERE ${column} = ? LIMIT 1`, [code], connection);
}


async function findBrandByNameOrCode(value, connection = db) {
  return one('SELECT * FROM master_brands WHERE UPPER(TRIM(name))=UPPER(TRIM(?)) OR UPPER(TRIM(code))=UPPER(TRIM(?)) LIMIT 1', [value, value], connection);
}

async function findItemTypeByNameOrCode(value, connection = db) {
  return one('SELECT * FROM master_item_types WHERE UPPER(TRIM(name))=UPPER(TRIM(?)) OR UPPER(TRIM(code))=UPPER(TRIM(?)) LIMIT 1', [value, value], connection);
}

async function findParentDuplicateCombination(brandId, subBrand, itemName, excludeId = null, connection = db) {
  const params = [brandId, String(subBrand || '').trim(), String(itemName || '').trim()];
  let sql = `SELECT id,parent_code,parent_name FROM item_parents WHERE brand_id=? AND UPPER(TRIM(COALESCE(sub_brand,'')))=UPPER(TRIM(?)) AND UPPER(TRIM(COALESCE(item_name,'')))=UPPER(TRIM(?))`;
  if (excludeId) { sql += ' AND id<>?'; params.push(excludeId); }
  sql += ' LIMIT 1';
  return one(sql, params, connection);
}

async function findSubbrandByName(name, connection = db) {
  return one('SELECT * FROM master_subbrands WHERE name = ? LIMIT 1', [name], connection);
}

async function createSubbrand(name, connection = db) {
  const id = crypto.randomUUID();
  const normalized = String(name).trim().toLowerCase();
  await connection.query('INSERT INTO master_subbrands (id,name,normalized_name,is_active) VALUES (?,?,?,1)', [id, name, normalized]);
  return { id, name, normalized_name: normalized, is_active: 1 };
}

async function findVariantValue(attributeCode, valueCode, connection = db) {
  return one(`SELECT mv.*, ma.code attribute_code, ma.name attribute_name
    FROM master_variant_values mv
    INNER JOIN master_variant_attributes ma ON ma.id = mv.attribute_id
    WHERE ma.code = ? AND mv.code = ? LIMIT 1`, [attributeCode, valueCode], connection);
}

async function listReferences(connection = db) {
  const [brands, categories, itemTypes, uoms, ports, attributes, values, parents, items] = await Promise.all([
    many('SELECT code,name,is_active FROM master_brands ORDER BY code', [], connection),
    many('SELECT detail_category,sub_category,main_category,brand_category,is_active FROM master_categories ORDER BY detail_category', [], connection),
    many('SELECT code,name,is_active FROM master_item_types ORDER BY code', [], connection),
    many('SELECT code,name,is_active FROM master_uoms ORDER BY code', [], connection),
    many('SELECT code,country_code,name,is_active FROM master_ports ORDER BY code', [], connection),
    many('SELECT code,name,is_active FROM master_variant_attributes ORDER BY code', [], connection),
    many(`SELECT ma.code attribute_code,mv.code value_code,mv.name value_name,mv.is_active
      FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id
      ORDER BY ma.code,mv.sort_order,mv.code`, [], connection),
    many('SELECT parent_code,parent_name,status FROM item_parents ORDER BY parent_code', [], connection),
    many("SELECT item_code,item_name,item_kind,is_active FROM items ORDER BY item_code", [], connection),
  ]);
  return { brands, categories, itemTypes, uoms, ports, attributes, values, parents, items };
}

async function insertParent(data, connection = db) {
  const id = crypto.randomUUID();
  await connection.query(`INSERT INTO item_parents
    (id,subbrand_id,parent_code,brand_id,sub_brand,item_name,category_id,item_type_id,parent_name,status,created_by,updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [
    id, data.subbrand_id, data.parent_code, data.brand_id, data.sub_brand, data.item_name,
    data.category_id, data.item_type_id, data.parent_name, data.status || 'active', data.user_id, data.user_id,
  ]);
  return id;
}

async function patchParent(id, fields, userId, connection = db) {
  const allowed = ['subbrand_id','brand_id','sub_brand','item_name','category_id','item_type_id','parent_name','status'];
  const keys = allowed.filter((key) => Object.prototype.hasOwnProperty.call(fields, key));
  if (!keys.length) return;
  const sql = `UPDATE item_parents SET ${keys.map((key) => `${key}=?`).join(',')},updated_by=? WHERE id=?`;
  await connection.query(sql, [...keys.map((key) => fields[key]), userId, id]);
}

async function replaceParentPorts(parentId, ports, connection = db) {
  await connection.query('DELETE FROM item_parent_ports WHERE item_parent_id=?', [parentId]);
  if (!ports.length) return;
  const values = ports.map((port, index) => [crypto.randomUUID(), parentId, port.id, index === 0 ? 1 : 0, index + 1]);
  await connection.query('INSERT INTO item_parent_ports (id,item_parent_id,port_id,is_primary,sort_order) VALUES ?', [values]);
}

async function replaceParentAttributes(parentId, attributes, connection = db) {
  await connection.query('DELETE FROM item_parent_variant_attributes WHERE item_parent_id=?', [parentId]);
  if (!attributes.length) return;
  const values = attributes.map((attribute, index) => [crypto.randomUUID(), parentId, attribute.id, index + 1]);
  await connection.query('INSERT INTO item_parent_variant_attributes (id,item_parent_id,attribute_id,sort_order) VALUES ?', [values]);
}

async function insertItem(data, connection = db) {
  const id = crypto.randomUUID();
  await connection.query(`INSERT INTO items
    (id,item_code,barcode,item_name,selling_name,item_kind,parent_id,uom_id,qty_per_pack,height,width,depth,gross_weight_pack,production_time_days,is_active,created_by,updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
    id, data.item_code, data.barcode, data.item_name, data.selling_name, data.item_kind,
    data.parent_id, data.uom_id, data.qty_per_pack, data.height, data.width, data.depth,
    data.gross_weight_pack, data.production_time_days, data.is_active, data.user_id, data.user_id,
  ]);
  return id;
}

async function patchItem(id, fields, userId, connection = db) {
  const allowed = ['item_name','selling_name','parent_id','uom_id','qty_per_pack','height','width','depth','gross_weight_pack','production_time_days','is_active'];
  const keys = allowed.filter((key) => Object.prototype.hasOwnProperty.call(fields, key));
  if (!keys.length) return;
  const sql = `UPDATE items SET ${keys.map((key) => `${key}=?`).join(',')},updated_by=? WHERE id=?`;
  await connection.query(sql, [...keys.map((key) => fields[key]), userId, id]);
}

async function replaceItemVariants(itemId, variants, connection = db) {
  await connection.query('DELETE FROM item_variant_values WHERE item_id=?', [itemId]);
  if (!variants.length) return;
  const values = variants.map((variant) => [crypto.randomUUID(), itemId, variant.attribute_id, variant.value_id]);
  await connection.query('INSERT INTO item_variant_values (id,item_id,attribute_id,variant_value_id) VALUES ?', [values]);
}

async function replaceBundleComponents(bundleId, components, connection = db) {
  await connection.query('DELETE FROM item_bundle_components WHERE bundle_item_id=?', [bundleId]);
  if (!components.length) return;
  const values = components.map((component, index) => [crypto.randomUUID(), bundleId, component.item_id, component.qty, component.sort_order || index + 1]);
  await connection.query('INSERT INTO item_bundle_components (id,bundle_item_id,component_item_id,qty,sort_order) VALUES ?', [values]);
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
  findParentByCode, findItemByCode, findLastParentCode, findByCode, findBrandByNameOrCode, findItemTypeByNameOrCode, findParentDuplicateCombination, findSubbrandByName,
  createSubbrand, findVariantValue, listReferences, insertParent, patchParent,
  replaceParentPorts, replaceParentAttributes, insertItem, patchItem, replaceItemVariants,
  replaceBundleComponents, transaction,
};
