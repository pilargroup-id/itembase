const crypto = require('crypto');
const { db } = require('../../config/database.config');

async function findAttributes({ search, is_active } = {}) {
  const params = [];
  let sql = `SELECT id, code, name, is_active, created_at, updated_at FROM master_variant_attributes WHERE 1=1`;
  if (search) { sql += ' AND (code LIKE ? OR name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (is_active !== undefined && is_active !== '') { sql += ' AND is_active = ?'; params.push(Number(is_active)); }
  sql += ' ORDER BY name ASC';
  return (await db.query(sql, params))[0];
}
async function findAttributeById(id, connection = db) { const [r] = await connection.query('SELECT id,code,name,is_active,created_at,updated_at FROM master_variant_attributes WHERE id=? LIMIT 1',[id]); return r[0]||null; }
async function createAttribute(data) { const id=crypto.randomUUID(); await db.query('INSERT INTO master_variant_attributes (id,code,name,is_active) VALUES (?,?,?,?)',[id,data.code,data.name,data.is_active]); return id; }
async function updateAttribute(id,data) { return (await db.query('UPDATE master_variant_attributes SET code=?,name=?,is_active=?,updated_at=NOW() WHERE id=?',[data.code,data.name,data.is_active,id]))[0]; }
async function updateAttributeStatus(id,isActive) { return (await db.query('UPDATE master_variant_attributes SET is_active=?,updated_at=NOW() WHERE id=?',[isActive,id]))[0]; }
async function deleteAttribute(id) { return (await db.query('DELETE FROM master_variant_attributes WHERE id=?',[id]))[0]; }
async function countAttributeUsage(id) { const [r]=await db.query(`SELECT (SELECT COUNT(*) FROM master_variant_values WHERE attribute_id=?) + (SELECT COUNT(*) FROM item_parent_variant_attributes WHERE attribute_id=?) + (SELECT COUNT(*) FROM item_variant_values WHERE attribute_id=?) total`,[id,id,id]); return Number(r[0]?.total||0); }

async function findValues({ search, attribute_id, is_active } = {}) {
  const params=[]; let sql=`SELECT mv.id,mv.attribute_id,ma.code attribute_code,ma.name attribute_name,mv.code,mv.name,mv.sort_order,mv.is_active,mv.created_at,mv.updated_at FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id WHERE 1=1`;
  if(search){sql+=' AND (mv.code LIKE ? OR mv.name LIKE ? OR ma.code LIKE ? OR ma.name LIKE ?)';params.push(...Array(4).fill(`%${search}%`));}
  if(attribute_id){sql+=' AND mv.attribute_id=?';params.push(attribute_id);}
  if(is_active!==undefined&&is_active!==''){sql+=' AND mv.is_active=?';params.push(Number(is_active));}
  sql+=' ORDER BY ma.name,mv.sort_order,mv.name'; return (await db.query(sql,params))[0];
}
async function findValueById(id, connection=db){const[r]=await connection.query(`SELECT mv.id,mv.attribute_id,ma.code attribute_code,ma.name attribute_name,mv.code,mv.name,mv.sort_order,mv.is_active,mv.created_at,mv.updated_at FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id WHERE mv.id=? LIMIT 1`,[id]);return r[0]||null;}
async function findValuesByIds(ids=[],connection=db){if(!ids.length)return[];const ph=ids.map(()=>'?').join(',');const[r]=await connection.query(`SELECT mv.id,mv.attribute_id,ma.code attribute_code,ma.name attribute_name,mv.code,mv.name,mv.sort_order,mv.is_active FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id WHERE mv.id IN (${ph})`,ids);return r;}
async function createValue(data){const id=crypto.randomUUID();await db.query('INSERT INTO master_variant_values (id,attribute_id,code,name,sort_order,is_active) VALUES (?,?,?,?,?,?)',[id,data.attribute_id,data.code,data.name,data.sort_order,data.is_active]);return id;}
async function updateValue(id,data){return(await db.query('UPDATE master_variant_values SET attribute_id=?,code=?,name=?,sort_order=?,is_active=?,updated_at=NOW() WHERE id=?',[data.attribute_id,data.code,data.name,data.sort_order,data.is_active,id]))[0];}
async function updateValueStatus(id,v){return(await db.query('UPDATE master_variant_values SET is_active=?,updated_at=NOW() WHERE id=?',[v,id]))[0];}
async function deleteValue(id){return(await db.query('DELETE FROM master_variant_values WHERE id=?',[id]))[0];}
async function countValueUsage(id){const[r]=await db.query('SELECT COUNT(*) total FROM item_variant_values WHERE variant_value_id=?',[id]);return Number(r[0]?.total||0);}
module.exports={findAttributes,findAttributeById,createAttribute,updateAttribute,updateAttributeStatus,deleteAttribute,countAttributeUsage,findValues,findValueById,findValuesByIds,createValue,updateValue,updateValueStatus,deleteValue,countValueUsage};
