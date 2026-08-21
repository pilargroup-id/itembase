const crypto = require('crypto');
const { db } = require('../../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 250);
  return { page, limit, offset: (page - 1) * limit };
}

function buildOrderByClause(sort = '') {
  const map = { 'date-desc': 'ip.created_at DESC, ip.parent_code DESC', 'date-asc': 'ip.created_at ASC, ip.parent_code ASC', 'code-desc': 'ip.parent_code DESC', 'code-asc': 'ip.parent_code ASC', 'name-desc': 'ip.parent_name DESC, ip.parent_code DESC', 'name-asc': 'ip.parent_name ASC, ip.parent_code ASC' };
  return `ORDER BY ${map[sort] || map['date-desc']}`;
}

function buildWhereClause(query = {}) {
  const conditions = [], params = [];
  if (query.search) {
    const search = `%${query.search}%`;
    conditions.push(`(
      ip.parent_code LIKE ? OR ip.item_name LIKE ? OR ip.parent_name LIKE ? OR ip.sub_brand LIKE ?
      OR ms.name LIKE ? OR mb.code LIKE ? OR mb.name LIKE ? OR mc.detail_category LIKE ?
      OR mc.sub_category LIKE ? OR mc.main_category LIKE ? OR mc.brand_category LIKE ?
      OR mit.code LIKE ? OR mit.name LIKE ?
      OR EXISTS (
        SELECT 1 FROM item_parent_ports ipp_s
        INNER JOIN master_ports mp_s ON mp_s.id = ipp_s.port_id
        WHERE ipp_s.item_parent_id = ip.id AND (mp_s.code LIKE ? OR mp_s.name LIKE ?)
      )
    )`);
    params.push(...Array(15).fill(search));
  }
  const exact = [['status','ip.status'],['main_category','mc.main_category'],['sub_category','mc.sub_category'],['detail_category','mc.detail_category'],['brand_category','mc.brand_category'],['brand_name','mb.name'],['sub_brand','ip.sub_brand'],['subbrand_id','ip.subbrand_id'],['brand_id','ip.brand_id'],['category_id','ip.category_id'],['item_type_id','ip.item_type_id']];
  exact.forEach(([key,column]) => { if (query[key]) { conditions.push(`${column} = ?`); params.push(query[key]); } });
  if (query.port_id) {
    conditions.push('EXISTS (SELECT 1 FROM item_parent_ports ipp_f WHERE ipp_f.item_parent_id = ip.id AND ipp_f.port_id = ?)');
    params.push(query.port_id);
  }
  return { whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function baseSelectSql() {
  return `
    SELECT ip.id, ip.subbrand_id, ip.parent_code, ip.brand_id, ip.sub_brand, ip.item_name,
           ip.category_id, ip.item_type_id, ip.parent_name, ip.status, ip.created_by,
           ip.updated_by, ip.created_at, ip.updated_at,
           (SELECT COUNT(*) FROM items ci WHERE ci.parent_id = ip.id) AS item_count,
           ms.name AS subbrand_name, ms.normalized_name AS subbrand_normalized_name,
           ms.is_active AS subbrand_is_active, mb.code AS brand_code, mb.name AS brand_name,
           mc.detail_category AS category_detail_category, mc.sub_category AS category_sub_category,
           mc.main_category AS category_main_category, mc.brand_category AS category_brand_category,
           mit.code AS item_type_code, mit.name AS item_type_name
    FROM item_parents ip
    LEFT JOIN master_subbrands ms ON ms.id = ip.subbrand_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    INNER JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
  `;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id, parent_code: row.parent_code, subbrand_id: row.subbrand_id,
    sub_brand: row.sub_brand, item_name: row.item_name, parent_name: row.parent_name,
    status: row.status, created_by: row.created_by, updated_by: row.updated_by,
    created_at: row.created_at, updated_at: row.updated_at, item_count: Number(row.item_count || 0),
    subbrand: row.subbrand_id ? { id: row.subbrand_id, name: row.subbrand_name, normalized_name: row.subbrand_normalized_name, is_active: row.subbrand_is_active } : null,
    brand: row.brand_id ? { id: row.brand_id, code: row.brand_code, name: row.brand_name } : null,
    category: { id: row.category_id, detail_category: row.category_detail_category, sub_category: row.category_sub_category, main_category: row.category_main_category, brand_category: row.category_brand_category },
    item_type: row.item_type_id ? { id: row.item_type_id, code: row.item_type_code, name: row.item_type_name } : null,
    ports: [],
    variant_attributes: [],
  };
}

async function findPortsByParentIds(ids = [], connection = db) {
  if (!ids.length) return {};
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await connection.query(`
    SELECT ipp.id AS relation_id, ipp.item_parent_id, ipp.port_id, ipp.is_primary,
           ipp.sort_order, ipp.created_at, ipp.updated_at,
           mp.country_code, mp.code, mp.name, mp.is_active
    FROM item_parent_ports ipp
    INNER JOIN master_ports mp ON mp.id = ipp.port_id
    WHERE ipp.item_parent_id IN (${placeholders})
    ORDER BY ipp.item_parent_id, ipp.is_primary DESC, ipp.sort_order, mp.name
  `, ids);
  return rows.reduce((out,row) => {
    if (!out[row.item_parent_id]) out[row.item_parent_id] = [];
    out[row.item_parent_id].push({ relation_id: row.relation_id, id: row.port_id, country_code: row.country_code, code: row.code, name: row.name, is_primary: row.is_primary, sort_order: row.sort_order, is_active: row.is_active, created_at: row.created_at, updated_at: row.updated_at });
    return out;
  }, {});
}


async function findOptions(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 20, 10), 1), 100);
  const offset = (page - 1) * limit;
  const search = String(query.search || '').trim();
  const status = String(query.status || 'active').trim();
  const selectedId = String(query.selected_id || '').trim();

  const conditions = [];
  const params = [];

  if (search) {
    const keyword = `%${search}%`;
    conditions.push('(ip.parent_code LIKE ? OR ip.parent_name LIKE ? OR ip.item_name LIKE ?)');
    params.push(keyword, keyword, keyword);
  }

  if (status) {
    conditions.push('ip.status = ?');
    params.push(status);
  }

  let whereSql = conditions.length ? `(${conditions.join(' AND ')})` : '1 = 1';

  if (selectedId) {
    whereSql = `(${whereSql} OR ip.id = ?)`;
    params.push(selectedId);
  }

  const [rows] = await db.query(`
    SELECT
      ip.id,
      ip.parent_code,
      ip.parent_name,
      ip.item_name,
      ip.status
    FROM item_parents ip
    WHERE ${whereSql}
    ORDER BY
      CASE WHEN ip.id = ? THEN 0 ELSE 1 END,
      ip.parent_code ASC
    LIMIT ? OFFSET ?
  `, [...params, selectedId || '', limit, offset]);

  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    FROM item_parents ip
    WHERE ${whereSql}
  `, params);

  const total = Number(countRows[0]?.total || 0);

  return {
    data: rows.map((row) => ({
      id: row.id,
      parent_code: row.parent_code,
      parent_name: row.parent_name,
      item_name: row.item_name,
      status: row.status,
      label: `${row.parent_code} - ${row.parent_name}`,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total_page: Math.ceil(total / limit),
    },
  };
}

async function findAll(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, params } = buildWhereClause(query);
  const [rows] = await db.query(`${baseSelectSql()} ${whereSql} ${buildOrderByClause(query.sort)} LIMIT ? OFFSET ?`, [...params,limit,offset]);
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM item_parents ip LEFT JOIN master_subbrands ms ON ms.id=ip.subbrand_id LEFT JOIN master_brands mb ON mb.id=ip.brand_id INNER JOIN master_categories mc ON mc.id=ip.category_id LEFT JOIN master_item_types mit ON mit.id=ip.item_type_id ${whereSql}`, params);
  const data = rows.map(mapRow);
  const ids=data.map((row)=>row.id);
  const [ports,variantAttributes]=await Promise.all([findPortsByParentIds(ids),findVariantAttributesByParentIds(ids)]);
  data.forEach((row) => { row.ports = ports[row.id] || []; row.variant_attributes=variantAttributes[row.id]||[]; });
  const total = countRows[0]?.total || 0;
  return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total/limit)), total_page: Math.ceil(total/limit) } };
}

async function findById(id, connection = db) {
  const [rows] = await connection.query(`${baseSelectSql()} WHERE ip.id = ? LIMIT 1`, [id]);
  const row = mapRow(rows[0]);
  if (!row) return null;
  const [ports, variantAttributes] = await Promise.all([findPortsByParentIds([id], connection), findVariantAttributesByParentIds([id], connection)]);
  row.ports = ports[id] || [];
  row.variant_attributes = variantAttributes[id] || [];
  return row;
}

async function findRawById(id, connection = db) { const [rows] = await connection.query('SELECT * FROM item_parents WHERE id=? LIMIT 1',[id]); return rows[0]||null; }
async function findLastParentCode(connection = db) { const [rows] = await connection.query("SELECT parent_code FROM item_parents WHERE parent_code REGEXP '^P[0-9]{6}$' ORDER BY CAST(SUBSTRING(parent_code,2) AS UNSIGNED) DESC LIMIT 1"); return rows[0]?.parent_code||null; }

async function create(data, connection = db) {
  await connection.query(`INSERT INTO item_parents (id,subbrand_id,parent_code,brand_id,sub_brand,item_name,category_id,item_type_id,parent_name,status,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [data.id,data.subbrand_id||null,data.parent_code,data.brand_id||null,data.sub_brand||null,data.item_name||null,data.category_id,data.item_type_id||null,data.parent_name,data.status||'active',data.created_by||null,data.updated_by||null]);
  return findById(data.id, connection);
}

async function update(id,data,connection=db) {
  await connection.query(`UPDATE item_parents SET subbrand_id=?,brand_id=?,sub_brand=?,item_name=?,category_id=?,item_type_id=?,parent_name=?,status=?,updated_by=? WHERE id=?`, [data.subbrand_id||null,data.brand_id||null,data.sub_brand||null,data.item_name||null,data.category_id,data.item_type_id||null,data.parent_name,data.status,data.updated_by||null,id]);
  return findById(id,connection);
}

async function replacePorts(parentId, ports = [], connection = db) {
  await connection.query('DELETE FROM item_parent_ports WHERE item_parent_id=?',[parentId]);
  if (!ports.length) return [];
  const values = ports.map((port,index) => [crypto.randomUUID(),parentId,port.port_id,port.is_primary ?? (index===0?1:0),port.sort_order ?? index+1]);
  await connection.query('INSERT INTO item_parent_ports (id,item_parent_id,port_id,is_primary,sort_order) VALUES ?',[values]);
  const grouped = await findPortsByParentIds([parentId],connection);
  return grouped[parentId]||[];
}


async function findVariantAttributesByParentIds(ids = [], connection = db) {
  if (!ids.length) return {};
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.query(`SELECT ipva.id relation_id,ipva.item_parent_id,ipva.attribute_id,ipva.sort_order,ma.code,ma.name,ma.is_active FROM item_parent_variant_attributes ipva INNER JOIN master_variant_attributes ma ON ma.id=ipva.attribute_id WHERE ipva.item_parent_id IN (${placeholders}) ORDER BY ipva.item_parent_id,ipva.sort_order,ma.name`, ids);
  return rows.reduce((g,r)=>{(g[r.item_parent_id]??=[]).push({id:r.attribute_id,relation_id:r.relation_id,code:r.code,name:r.name,sort_order:r.sort_order,is_active:r.is_active});return g;},{});
}
async function replaceVariantAttributes(parentId, attributes = [], connection = db) {
  await connection.query('DELETE FROM item_parent_variant_attributes WHERE item_parent_id=?',[parentId]);
  if(!attributes.length)return[];
  const values=attributes.map((a,i)=>[crypto.randomUUID(),parentId,a.attribute_id||a.id,a.sort_order||i+1]);
  await connection.query('INSERT INTO item_parent_variant_attributes (id,item_parent_id,attribute_id,sort_order) VALUES ?',[values]);
  const grouped=await findVariantAttributesByParentIds([parentId],connection);return grouped[parentId]||[];
}
async function findVariantAttributesByIds(ids=[],connection=db){if(!ids.length)return[];const ph=ids.map(()=>'?').join(',');const[r]=await connection.query(`SELECT id,code,name,is_active FROM master_variant_attributes WHERE id IN (${ph})`,ids);return r;}

async function countChildItems(parentId,connection=db){const[r]=await connection.query('SELECT COUNT(*) total FROM items WHERE parent_id=?',[parentId]);return Number(r[0]?.total||0);}

async function findBrandById(id,connection=db){const [rows]=await connection.query('SELECT id,code,name,is_active FROM master_brands WHERE id=? LIMIT 1',[id]);return rows[0]||null;}
async function findDuplicateCombination(brandId,subBrand,itemName,excludeId=null,connection=db){
  const params=[brandId,String(subBrand||'').trim(),String(itemName||'').trim()];
  let sql=`SELECT id,parent_code,parent_name FROM item_parents WHERE brand_id=? AND UPPER(TRIM(COALESCE(sub_brand,'')))=UPPER(TRIM(?)) AND UPPER(TRIM(COALESCE(item_name,'')))=UPPER(TRIM(?))`;
  if(excludeId){sql+=' AND id<>?';params.push(excludeId);}
  sql+=' LIMIT 1';
  const [rows]=await connection.query(sql,params);return rows[0]||null;
}
async function remove(id,connection=db){
  await connection.query('DELETE FROM item_parent_ports WHERE item_parent_id=?',[id]);
  await connection.query('DELETE FROM item_parent_variant_attributes WHERE item_parent_id=?',[id]);
  await connection.query('DELETE FROM master_subbrand_items WHERE item_parent_id=?',[id]);
  const [result]=await connection.query('DELETE FROM item_parents WHERE id=?',[id]);
  return result;
}

async function findActiveChildItems(parentId,connection=db){const [rows]=await connection.query('SELECT * FROM items WHERE parent_id=? AND is_active=1',[parentId]);return rows;}
async function deactivateChildItems(parentId, connection=db) { await connection.query('UPDATE items SET is_active=0,updated_at=NOW() WHERE parent_id=? AND is_active<>0',[parentId]); }
async function existsInTable(tableName,id,connection=db) { const allowed=['master_subbrands','master_brands','master_categories','master_item_types','master_ports']; if(!allowed.includes(tableName)) throw new Error('Invalid reference table'); const [rows]=await connection.query(`SELECT id FROM ${tableName} WHERE id=? LIMIT 1`,[id]); return rows.length>0; }
async function findSubbrandById(id,connection=db){const [rows]=await connection.query('SELECT id,name,normalized_name,is_active,created_at,updated_at FROM master_subbrands WHERE id=? LIMIT 1',[id]);return rows[0]||null;}
async function findSubbrandByName(name,connection=db){const [rows]=await connection.query('SELECT id,name,normalized_name,is_active,created_at,updated_at FROM master_subbrands WHERE name=? LIMIT 1',[name]);return rows[0]||null;}
async function createSubbrand(data,connection=db){const id=crypto.randomUUID();await connection.query('INSERT INTO master_subbrands (id,name,normalized_name,is_active) VALUES (?,?,?,1)',[id,data.name,data.normalized_name]);return findSubbrandById(id,connection);}
async function upsertSubbrandItem(data,connection=db){await connection.query(`INSERT INTO master_subbrand_items (id,subbrand_id,item_parent_id,item_name,normalized_item_name,is_active,created_at,updated_at) VALUES (?,?,?,?,?,1,NOW(),NOW()) ON DUPLICATE KEY UPDATE item_parent_id=VALUES(item_parent_id),normalized_item_name=VALUES(normalized_item_name),is_active=1,updated_at=NOW()`,[crypto.randomUUID(),data.subbrand_id,data.item_parent_id||null,data.item_name,data.normalized_item_name]);}
async function findSubbrandSuggestionCandidates(connection=db){const [rows]=await connection.query(`SELECT ms.id AS subbrand_id,ms.name AS sub_brand,msi.item_name AS parent_name FROM master_subbrand_items msi INNER JOIN master_subbrands ms ON ms.id=msi.subbrand_id WHERE ms.is_active=1 AND msi.is_active=1 ORDER BY ms.name,msi.item_name`);return rows;}
async function transaction(callback){const connection=await db.getConnection();try{await connection.beginTransaction();const result=await callback(connection);await connection.commit();return result;}catch(error){await connection.rollback();throw error;}finally{connection.release();}}

module.exports={findOptions,findAll,findById,findRawById,findLastParentCode,create,update,replacePorts,findVariantAttributesByParentIds,replaceVariantAttributes,findVariantAttributesByIds,countChildItems,findBrandById,findDuplicateCombination,remove,findActiveChildItems,deactivateChildItems,existsInTable,findSubbrandById,findSubbrandByName,createSubbrand,upsertSubbrandItem,findSubbrandSuggestionCandidates,transaction};
