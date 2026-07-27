const crypto=require('crypto');const{db}=require('../../config/database.config');
async function findAll({search,country_code,is_active}={}){const p=[];let s=`SELECT id,country_code,code,name,is_active,created_at,updated_at FROM master_ports WHERE 1=1`;if(search){s+=` AND (country_code LIKE ? OR code LIKE ? OR name LIKE ?)`;p.push(...Array(3).fill(`%${search}%`));}if(country_code){s+=` AND country_code=?`;p.push(country_code);}if(is_active!==undefined&&is_active!==''){s+=` AND is_active=?`;p.push(Number(is_active));}s+=` ORDER BY country_code,name`;return(await db.query(s,p))[0];}
async function findById(id){const[r]=await db.query(`SELECT id,country_code,code,name,is_active,created_at,updated_at FROM master_ports WHERE id=? LIMIT 1`,[id]);return r[0]||null;}
async function create(d){const id=crypto.randomUUID();await db.query(`INSERT INTO master_ports (id,country_code,code,name,is_active) VALUES (?,?,?,?,?)`,[id,d.country_code,d.code,d.name,d.is_active]);return id;}
async function update(id,d){return(await db.query(`UPDATE master_ports SET country_code=?,code=?,name=?,is_active=?,updated_at=NOW() WHERE id=?`,[d.country_code,d.code,d.name,d.is_active,id]))[0];}
async function remove(id){return(await db.query(`DELETE FROM master_ports WHERE id=?`,[id]))[0];}
async function countUsedByItemParents(id){const[r]=await db.query(`SELECT COUNT(*) total FROM item_parent_ports WHERE port_id=?`,[id]);return r[0]?.total||0;}
async function updateStatus(id,v){return(await db.query(`UPDATE master_ports SET is_active=?,updated_at=NOW() WHERE id=?`,[v,id]))[0];}
module.exports={findAll,findById,create,update,updateStatus,remove,countUsedByItemParents};
