const crypto = require('crypto');
const { db } = require('../../config/database.config');

async function findChannelsByBrandIds(ids = [], connection = db) {
  if (!ids.length) return {};
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await connection.query(`SELECT id,brand_id,business_unit_id,department_id,channel_name,channel_code,is_primary,is_active,created_at,updated_at FROM master_brand_channels WHERE brand_id IN (${placeholders}) ORDER BY brand_id,is_primary DESC,business_unit_id,department_id`, ids);
  return rows.reduce((out,row)=>{if(!out[row.brand_id])out[row.brand_id]=[];out[row.brand_id].push(row);return out;},{});
}

async function findAll({ search, is_active } = {}) {
  const params=[]; let sql='SELECT id,name,code,is_active,created_at,updated_at FROM master_brands WHERE 1=1';
  if(search){sql+=' AND (name LIKE ? OR code LIKE ?)';params.push(`%${search}%`,`%${search}%`);}
  if(is_active!==undefined&&is_active!==''){sql+=' AND is_active=?';params.push(Number(is_active));}
  sql+=' ORDER BY name ASC';
  const [rows]=await db.query(sql,params); const channels=await findChannelsByBrandIds(rows.map(r=>r.id));
  return rows.map(row=>({...row,channels:channels[row.id]||[]}));
}

async function findById(id,connection=db){const [rows]=await connection.query('SELECT id,name,code,is_active,created_at,updated_at FROM master_brands WHERE id=? LIMIT 1',[id]);const row=rows[0];if(!row)return null;const channels=await findChannelsByBrandIds([id],connection);return {...row,channels:channels[id]||[]};}
async function create(data,connection=db){const id=crypto.randomUUID();await connection.query('INSERT INTO master_brands (id,name,code,is_active) VALUES (?,?,?,?)',[id,data.name,data.code,data.is_active]);return id;}
async function update(id,data,connection=db){return (await connection.query('UPDATE master_brands SET name=?,code=?,is_active=?,updated_at=NOW() WHERE id=?',[data.name,data.code,data.is_active,id]))[0];}
async function replaceChannels(brandId,channels=[],connection=db){await connection.query('DELETE FROM master_brand_channels WHERE brand_id=?',[brandId]);if(!channels.length)return[];const values=channels.map((c,i)=>[crypto.randomUUID(),brandId,c.business_unit_id,Number(c.department_id),c.channel_name||null,c.channel_code||null,c.is_primary??(i===0?1:0),c.is_active??1]);await connection.query('INSERT INTO master_brand_channels (id,brand_id,business_unit_id,department_id,channel_name,channel_code,is_primary,is_active) VALUES ?',[values]);return (await findChannelsByBrandIds([brandId],connection))[brandId]||[];}
async function remove(id){return (await db.query('DELETE FROM master_brands WHERE id=?',[id]))[0];}
async function countUsedByItemParents(id){const [rows]=await db.query('SELECT COUNT(*) AS total FROM item_parents WHERE brand_id=?',[id]);return rows[0]?.total||0;}
async function updateStatus(id,is_active){return (await db.query('UPDATE master_brands SET is_active=?,updated_at=NOW() WHERE id=?',[is_active,id]))[0];}
async function transaction(callback){const connection=await db.getConnection();try{await connection.beginTransaction();const result=await callback(connection);await connection.commit();return result;}catch(error){await connection.rollback();throw error;}finally{connection.release();}}
module.exports={findAll,findById,create,update,replaceChannels,remove,countUsedByItemParents,updateStatus,transaction};
