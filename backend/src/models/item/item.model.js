const { db } = require('../../config/database.config');

function normalizePagination(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 250);
  return { page, limit, offset: (page - 1) * limit };
}

function buildOrderByClause(sort = '') {
  const sortMap = {
    'date-desc': 'i.created_at DESC, i.item_code DESC',
    'date-asc': 'i.created_at ASC, i.item_code ASC',
    'code-desc': 'i.item_code DESC',
    'code-asc': 'i.item_code ASC',
    'name-desc': 'i.item_name DESC, i.item_code DESC',
    'name-asc': 'i.item_name ASC, i.item_code ASC',
    'selling-name-desc': 'i.selling_name DESC, i.item_code DESC',
    'selling-name-asc': 'i.selling_name ASC, i.item_code ASC',
  };

  return `ORDER BY ${sortMap[sort] || sortMap['date-desc']}`;
}

function normalizeBooleanFilter(value) {
  if (value === undefined || value === null || value === '') return null;
  return Number(value) ? 1 : 0;
}

function buildWhereClause(query = {}) {
  const conditions = [];
  const params = [];

  if (query.search) {
    const search = `%${query.search}%`;
    conditions.push(`(
      i.item_code LIKE ? OR i.barcode LIKE ? OR i.item_name LIKE ? OR i.selling_name LIKE ?
      OR ip.parent_code LIKE ? OR ip.parent_name LIKE ?
      OR mb.code LIKE ? OR mb.name LIKE ? OR mc.detail_category LIKE ?
      OR mc.sub_category LIKE ? OR mc.main_category LIKE ? OR mc.brand_category LIKE ?
      OR mu.code LIKE ? OR mu.name LIKE ?
      OR EXISTS (SELECT 1 FROM item_variant_values ivv_s INNER JOIN master_variant_values mvv_s ON mvv_s.id=ivv_s.variant_value_id INNER JOIN master_variant_attributes mva_s ON mva_s.id=ivv_s.attribute_id WHERE ivv_s.item_id=i.id AND (mvv_s.code LIKE ? OR mvv_s.name LIKE ? OR mva_s.code LIKE ? OR mva_s.name LIKE ?))
      OR EXISTS (
        SELECT 1 FROM master_brand_channels mbc_search
        WHERE mbc_search.brand_id = ip.brand_id
          AND (mbc_search.channel_code LIKE ? OR mbc_search.channel_name LIKE ?)
      )
      OR EXISTS (
        SELECT 1 FROM item_parent_ports ipp_search
        INNER JOIN master_ports mp_search ON mp_search.id = ipp_search.port_id
        WHERE ipp_search.item_parent_id = ip.id
          AND (mp_search.code LIKE ? OR mp_search.name LIKE ?)
      )
    )`);
    params.push(...Array(22).fill(search));
  }

  const directFilters = [
    ['item_kind', 'i.item_kind'], ['parent_id', 'i.parent_id'], ['uom_id', 'i.uom_id'],
    ['status', 'ip.status'], ['brand_id', 'ip.brand_id'], ['category_id', 'ip.category_id'],
    ['item_type_id', 'ip.item_type_id'], ['item_code', 'i.item_code'], ['barcode', 'i.barcode'],
    ['created_by', 'i.created_by'],
  ];
  directFilters.forEach(([key, column]) => {
    if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
      conditions.push(`${column} = ?`);
      params.push(query[key]);
    }
  });

  const likeFilters = [['item_name', 'i.item_name'], ['selling_name', 'i.selling_name']];
  likeFilters.forEach(([key, column]) => {
    if (query[key]) {
      conditions.push(`${column} LIKE ?`);
      params.push(`%${query[key]}%`);
    }
  });

  const numericFilters = ['qty_per_pack', 'height', 'width', 'depth', 'gross_weight_pack', 'production_time_days'];
  numericFilters.forEach((key) => {
    if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
      conditions.push(`i.${key} = ?`);
      params.push(query[key]);
    }
  });

  const isActive = normalizeBooleanFilter(query.is_active);
  if (isActive !== null) {
    conditions.push('i.is_active = ?');
    params.push(isActive);
  }

  if (query.variant_attribute_id) { conditions.push('EXISTS (SELECT 1 FROM item_variant_values ivf WHERE ivf.item_id=i.id AND ivf.attribute_id=?)'); params.push(query.variant_attribute_id); }
  if (query.variant_value_id) { conditions.push('EXISTS (SELECT 1 FROM item_variant_values ivf WHERE ivf.item_id=i.id AND ivf.variant_value_id=?)'); params.push(query.variant_value_id); }

  if (query.port_id) {
    conditions.push(`EXISTS (
      SELECT 1 FROM item_parent_ports ipp_filter
      WHERE ipp_filter.item_parent_id = ip.id AND ipp_filter.port_id = ?
    )`);
    params.push(query.port_id);
  }

  if (query.business_unit_id) {
    conditions.push(`EXISTS (
      SELECT 1 FROM master_brand_channels mbc_filter
      WHERE mbc_filter.brand_id = ip.brand_id AND mbc_filter.business_unit_id = ?
    )`);
    params.push(query.business_unit_id);
  }

  if (query.department_id) {
    conditions.push(`EXISTS (
      SELECT 1 FROM master_brand_channels mbc_filter
      WHERE mbc_filter.brand_id = ip.brand_id AND mbc_filter.department_id = ?
    )`);
    params.push(Number(query.department_id));
  }

  if (query.channel_code) {
    conditions.push(`EXISTS (
      SELECT 1 FROM master_brand_channels mbc_filter
      WHERE mbc_filter.brand_id = ip.brand_id AND mbc_filter.channel_code = ?
    )`);
    params.push(query.channel_code);
  }

  if (query.channel_name) {
    conditions.push(`EXISTS (
      SELECT 1 FROM master_brand_channels mbc_filter
      WHERE mbc_filter.brand_id = ip.brand_id AND mbc_filter.channel_name LIKE ?
    )`);
    params.push(`%${query.channel_name}%`);
  }

  return { whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function baseSelectSql() {
  return `
    SELECT
      i.id, i.item_code, i.barcode, i.item_name, i.selling_name, i.item_kind,
      i.parent_id, i.uom_id, i.qty_per_pack, i.height, i.width,
      i.depth, i.gross_weight_pack, i.production_time_days, i.is_active,
      i.created_by, i.updated_by, i.created_at, i.updated_at,
      ip.parent_code, ip.parent_name, ip.status AS parent_status,
      mb.id AS brand_id, mb.code AS brand_code, mb.name AS brand_name,
      mc.id AS category_id, mc.detail_category AS category_detail_category,
      mc.sub_category AS category_sub_category, mc.main_category AS category_main_category,
      mc.brand_category AS category_brand_category,
      mit.id AS item_type_id, mit.code AS item_type_code, mit.name AS item_type_name,
      mu.code AS uom_code, mu.name AS uom_name
    FROM items i
    LEFT JOIN item_parents ip ON ip.id = i.parent_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    LEFT JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_uoms mu ON mu.id = i.uom_id
  `;
}

function mapBaseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    item_code: row.item_code,
    barcode: row.barcode,
    item_name: row.item_name,
    selling_name: row.selling_name,
    item_kind: row.item_kind,
    qty_per_pack: row.qty_per_pack,
    height: row.height,
    width: row.width,
    depth: row.depth,
    gross_weight_pack: row.gross_weight_pack,
    production_time_days: row.production_time_days,
    is_active: row.is_active,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent: row.parent_id ? {
      id: row.parent_id,
      parent_code: row.parent_code,
      parent_name: row.parent_name,
      status: row.parent_status,
      brand: row.brand_id ? { id: row.brand_id, code: row.brand_code, name: row.brand_name, channels: [] } : null,
      category: row.category_id ? {
        id: row.category_id,
        detail_category: row.category_detail_category,
        sub_category: row.category_sub_category,
        main_category: row.category_main_category,
        brand_category: row.category_brand_category,
        users: [],
      } : null,
      item_type: row.item_type_id ? { id: row.item_type_id, code: row.item_type_code, name: row.item_type_name } : null,
      ports: [],
      variant_attributes: [],
    } : null,
    uom: row.uom_id ? { id: row.uom_id, code: row.uom_code, name: row.uom_name } : null,
    components: [],
    variants: [],
    variant_summary: null,
  };
}

async function hydrateRelations(items, connection = db) {
  if (!items.length) return items;
  const parentIds = [...new Set(items.map((item) => item.parent?.id).filter(Boolean))];
  const brandIds = [...new Set(items.map((item) => item.parent?.brand?.id).filter(Boolean))];
  const categoryIds = [...new Set(items.map((item) => item.parent?.category?.id).filter(Boolean))];

  const itemIds = items.map((item)=>item.id);
  const [portsByParent, channelsByBrand, usersByCategory, variantsByItem, parentVariantAttributes] = await Promise.all([
    findPortsByParentIds(parentIds, connection),
    findChannelsByBrandIds(brandIds, connection),
    findCategoryUsersByCategoryIds(categoryIds, connection),
    findVariantsByItemIds(itemIds, connection),
    findParentVariantAttributesByParentIds(parentIds, connection),
  ]);

  items.forEach((item) => {
    item.variants = variantsByItem[item.id] || [];
    item.variant_summary = item.variants.map((v)=>v.value.name).join(' / ') || null;
    if (!item.parent) return;
    item.parent.ports = portsByParent[item.parent.id] || [];
    item.parent.variant_attributes = parentVariantAttributes[item.parent.id] || [];
    if (item.parent.brand) item.parent.brand.channels = channelsByBrand[item.parent.brand.id] || [];
    if (item.parent.category) item.parent.category.users = usersByCategory[item.parent.category.id] || [];
  });
  return items;
}

async function findAll(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, params } = buildWhereClause(query);
  const orderBySql = buildOrderByClause(query.sort);
  const [rows] = await db.query(`${baseSelectSql()} ${whereSql} ${orderBySql} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [countRows] = await db.query(`
    SELECT COUNT(DISTINCT i.id) AS total
    FROM items i
    LEFT JOIN item_parents ip ON ip.id = i.parent_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    LEFT JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_uoms mu ON mu.id = i.uom_id
    ${whereSql}
  `, params);
  const items = rows.map(mapBaseRow);
  await hydrateRelations(items);
  const total = countRows[0]?.total || 0;
  return { data: items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), total_page: Math.ceil(total / limit) } };
}

async function findById(id, connection = db) {
  const [rows] = await connection.query(`${baseSelectSql()} WHERE i.id = ? LIMIT 1`, [id]);
  const item = mapBaseRow(rows[0]);
  if (!item) return null;
  await hydrateRelations([item], connection);
  const components = await findComponentsByBundleItemIds([id], connection);
  item.components = components[id] || [];
  return item;
}

async function findRawById(id, connection = db) {
  const [rows] = await connection.query('SELECT * FROM items WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findParentById(id, connection = db) {
  const [rows] = await connection.query('SELECT id, parent_code, parent_name, status FROM item_parents WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findUomById(id, connection = db) {
  const [rows] = await connection.query('SELECT id FROM master_uoms WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findItemsByIds(ids = [], connection = db) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await connection.query(`SELECT id, item_code, item_name, selling_name, item_kind, is_active FROM items WHERE id IN (${placeholders})`, ids);
  return rows;
}

async function findLastBarcodeByYear(yearTwoDigits, connection = db) {
  const prefix = `68${yearTwoDigits}`;
  const [rows] = await connection.query(`
    SELECT item_code FROM items
    WHERE item_code LIKE ? AND item_code REGEXP ?
    ORDER BY CAST(SUBSTRING(item_code, 5) AS UNSIGNED) DESC
    LIMIT 1 FOR UPDATE
  `, [`${prefix}%`, `^${prefix}[0-9]{8}$`]);
  return rows[0]?.item_code || null;
}

async function create(data, connection = db) {
  await connection.query(`
    INSERT INTO items (
      id, item_code, barcode, item_name, selling_name, item_kind, parent_id, uom_id,
      qty_per_pack, height, width, depth, gross_weight_pack,
      production_time_days, is_active, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.id, data.item_code, data.barcode, data.item_name, data.selling_name,
    data.item_kind, data.parent_id, data.uom_id || null,
    data.qty_per_pack ?? null, data.height ?? null, data.width ?? null,
    data.depth ?? null, data.gross_weight_pack ?? null,
    data.production_time_days ?? null, data.is_active ?? 1,
    data.created_by || null, data.updated_by || null,
  ]);
  return findById(data.id, connection);
}

async function update(id, data, connection = db) {
  await connection.query(`
    UPDATE items SET
      item_name = ?, selling_name = ?, item_kind = ?, parent_id = ?, uom_id = ?,
      qty_per_pack = ?, height = ?, width = ?, depth = ?,
      gross_weight_pack = ?, production_time_days = ?, is_active = ?, updated_by = ?
    WHERE id = ?
  `, [
    data.item_name, data.selling_name, data.item_kind, data.parent_id,
    data.uom_id || null, data.qty_per_pack ?? null,
    data.height ?? null, data.width ?? null, data.depth ?? null,
    data.gross_weight_pack ?? null, data.production_time_days ?? null,
    data.is_active, data.updated_by || null, id,
  ]);
  return findById(id, connection);
}

async function replaceComponents(bundleItemId, components = [], connection = db) {
  await connection.query('DELETE FROM item_bundle_components WHERE bundle_item_id = ?', [bundleItemId]);
  if (!components.length) return [];
  const crypto = require('crypto');
  const values = components.map((component, index) => [crypto.randomUUID(), bundleItemId, component.component_item_id, component.qty, component.sort_order || index + 1]);
  await connection.query(`INSERT INTO item_bundle_components (id, bundle_item_id, component_item_id, qty, sort_order) VALUES ?`, [values]);
  const grouped = await findComponentsByBundleItemIds([bundleItemId], connection);
  return grouped[bundleItemId] || [];
}

async function deleteComponents(bundleItemId, connection = db) {
  await connection.query('DELETE FROM item_bundle_components WHERE bundle_item_id = ?', [bundleItemId]);
}

async function findPortsByParentIds(parentIds = [], connection = db) {
  if (!parentIds.length) return {};
  const placeholders = parentIds.map(() => '?').join(', ');
  const [rows] = await connection.query(`
    SELECT ipp.id, ipp.item_parent_id, ipp.port_id, ipp.is_primary, ipp.sort_order,
           ipp.created_at, ipp.updated_at, mp.country_code, mp.code, mp.name, mp.is_active
    FROM item_parent_ports ipp
    INNER JOIN master_ports mp ON mp.id = ipp.port_id
    WHERE ipp.item_parent_id IN (${placeholders})
    ORDER BY ipp.item_parent_id, ipp.is_primary DESC, ipp.sort_order ASC, mp.name ASC
  `, parentIds);
  return rows.reduce((grouped, row) => {
    if (!grouped[row.item_parent_id]) grouped[row.item_parent_id] = [];
    grouped[row.item_parent_id].push({ id: row.port_id, relation_id: row.id, country_code: row.country_code, code: row.code, name: row.name, is_primary: row.is_primary, sort_order: row.sort_order, is_active: row.is_active, created_at: row.created_at, updated_at: row.updated_at });
    return grouped;
  }, {});
}

async function findChannelsByBrandIds(brandIds = [], connection = db) {
  if (!brandIds.length) return {};
  const placeholders = brandIds.map(() => '?').join(', ');
  const [rows] = await connection.query(`
    SELECT id, brand_id, business_unit_id, department_id, channel_name, channel_code,
           is_primary, is_active, created_at, updated_at
    FROM master_brand_channels
    WHERE brand_id IN (${placeholders})
    ORDER BY brand_id, is_primary DESC, business_unit_id, department_id
  `, brandIds);
  return rows.reduce((grouped, row) => {
    if (!grouped[row.brand_id]) grouped[row.brand_id] = [];
    grouped[row.brand_id].push({ ...row, business_unit_code: null, business_unit_name: null, department_code: null, department_name: null });
    return grouped;
  }, {});
}

async function findCategoryUsersByCategoryIds(categoryIds = [], connection = db) {
  if (!categoryIds.length) return {};
  const placeholders = categoryIds.map(() => '?').join(', ');
  const [rows] = await connection.query(`
    SELECT id, category_id, central_user_id, is_primary, is_active, created_at, updated_at
    FROM master_category_users
    WHERE category_id IN (${placeholders})
    ORDER BY category_id, is_primary DESC, created_at ASC
  `, categoryIds);
  return rows.reduce((grouped, row) => {
    if (!grouped[row.category_id]) grouped[row.category_id] = [];
    grouped[row.category_id].push({ ...row, user: null });
    return grouped;
  }, {});
}


async function findVariantsByItemIds(itemIds=[],connection=db){if(!itemIds.length)return{};const ph=itemIds.map(()=>'?').join(',');const[rows]=await connection.query(`SELECT ivv.id relation_id,ivv.item_id,ivv.attribute_id,ivv.variant_value_id,ma.code attribute_code,ma.name attribute_name,mv.code value_code,mv.name value_name,mv.sort_order FROM item_variant_values ivv INNER JOIN master_variant_attributes ma ON ma.id=ivv.attribute_id INNER JOIN master_variant_values mv ON mv.id=ivv.variant_value_id WHERE ivv.item_id IN (${ph}) ORDER BY ivv.item_id,ma.name,mv.sort_order,mv.name`,itemIds);return rows.reduce((g,r)=>{(g[r.item_id]??=[]).push({relation_id:r.relation_id,attribute:{id:r.attribute_id,code:r.attribute_code,name:r.attribute_name},value:{id:r.variant_value_id,code:r.value_code,name:r.value_name,sort_order:r.sort_order}});return g;},{});}
async function findParentVariantAttributesByParentIds(parentIds=[],connection=db){if(!parentIds.length)return{};const ph=parentIds.map(()=>'?').join(',');const[rows]=await connection.query(`SELECT ipva.item_parent_id,ipva.attribute_id,ma.code,ma.name,ma.is_active,ipva.sort_order FROM item_parent_variant_attributes ipva INNER JOIN master_variant_attributes ma ON ma.id=ipva.attribute_id WHERE ipva.item_parent_id IN (${ph}) ORDER BY ipva.item_parent_id,ipva.sort_order`,parentIds);return rows.reduce((g,r)=>{(g[r.item_parent_id]??=[]).push({id:r.attribute_id,code:r.code,name:r.name,is_active:r.is_active,sort_order:r.sort_order});return g;},{});}
async function findParentVariantAttributes(parentId,connection=db){const grouped=await findParentVariantAttributesByParentIds([parentId],connection);return (grouped[parentId]||[]).map(a=>({attribute_id:a.id,...a}));}

async function findVariantValueByNameOrCode(attributeId, value, connection=db){
  const normalized=String(value||'').trim();
  if(!normalized)return null;
  const [rows]=await connection.query(`SELECT mv.id,mv.attribute_id,mv.code,mv.name,mv.sort_order,mv.is_active,ma.code attribute_code,ma.name attribute_name FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id WHERE mv.attribute_id=? AND (UPPER(TRIM(mv.name))=UPPER(TRIM(?)) OR UPPER(TRIM(mv.code))=UPPER(TRIM(?))) LIMIT 1`,[attributeId,normalized,normalized]);
  return rows[0]||null;
}
async function findVariantValueByCode(attributeId, code, connection=db){const [rows]=await connection.query('SELECT id,attribute_id,code,name,sort_order,is_active FROM master_variant_values WHERE attribute_id=? AND code=? LIMIT 1',[attributeId,code]);return rows[0]||null;}
async function nextVariantValueSortOrder(attributeId,connection=db){const [rows]=await connection.query('SELECT COALESCE(MAX(sort_order),0)+1 next_sort_order FROM master_variant_values WHERE attribute_id=?',[attributeId]);return Number(rows[0]?.next_sort_order||1);}
async function createVariantValue(data,connection=db){const crypto=require('crypto');const id=crypto.randomUUID();await connection.query('INSERT INTO master_variant_values (id,attribute_id,code,name,sort_order,is_active) VALUES (?,?,?,?,?,1)',[id,data.attribute_id,data.code,data.name,data.sort_order]);return findVariantValueByNameOrCode(data.attribute_id,data.code,connection);}
async function findVariantValuesByIds(ids=[],connection=db){if(!ids.length)return[];const ph=ids.map(()=>'?').join(',');const[rows]=await connection.query(`SELECT mv.id,mv.attribute_id,mv.code,mv.name,mv.is_active,ma.code attribute_code,ma.name attribute_name FROM master_variant_values mv INNER JOIN master_variant_attributes ma ON ma.id=mv.attribute_id WHERE mv.id IN (${ph})`,ids);return rows;}
async function replaceVariants(itemId,variants=[],connection=db){await connection.query('DELETE FROM item_variant_values WHERE item_id=?',[itemId]);if(!variants.length)return[];const crypto=require('crypto');const values=variants.map(v=>[crypto.randomUUID(),itemId,v.attribute_id,v.value_id]);await connection.query('INSERT INTO item_variant_values (id,item_id,attribute_id,variant_value_id) VALUES ?',[values]);const g=await findVariantsByItemIds([itemId],connection);return g[itemId]||[];}
async function findDuplicateVariantCombination(parentId,variants=[],excludeItemId=null,connection=db){if(!variants.length)return null;const clauses=variants.map(()=>'(ivv.attribute_id=? AND ivv.variant_value_id=?)').join(' OR ');const params=[];variants.forEach(v=>params.push(v.attribute_id,v.value_id));let sql=`SELECT i.id,i.item_code,i.item_name FROM items i WHERE i.parent_id=? ${excludeItemId?'AND i.id<>?':''} AND (SELECT COUNT(*) FROM item_variant_values x WHERE x.item_id=i.id)=? AND (SELECT COUNT(*) FROM item_variant_values ivv WHERE ivv.item_id=i.id AND (${clauses}))=? LIMIT 1`;const args=[parentId,...(excludeItemId?[excludeItemId]:[]),variants.length,...params,variants.length];const[r]=await connection.query(sql,args);return r[0]||null;}

async function findComponentsByBundleItemIds(bundleItemIds = [], connection = db) {
  if (!bundleItemIds.length) return {};
  const placeholders = bundleItemIds.map(() => '?').join(', ');
  const [rows] = await connection.query(`
    SELECT ibc.id, ibc.bundle_item_id, ibc.component_item_id, ibc.qty, ibc.sort_order,
           ibc.created_at, ibc.updated_at, i.item_code AS component_item_code,
           i.item_name AS component_item_name, i.selling_name AS component_selling_name,
           i.item_kind AS component_item_kind
    FROM item_bundle_components ibc
    INNER JOIN items i ON i.id = ibc.component_item_id
    WHERE ibc.bundle_item_id IN (${placeholders})
    ORDER BY ibc.sort_order ASC, ibc.created_at ASC
  `, bundleItemIds);
  return rows.reduce((grouped, row) => {
    if (!grouped[row.bundle_item_id]) grouped[row.bundle_item_id] = [];
    grouped[row.bundle_item_id].push({ id: row.id, qty: row.qty, sort_order: row.sort_order, item: { id: row.component_item_id, item_code: row.component_item_code, item_name: row.component_item_name, selling_name: row.component_selling_name, item_kind: row.component_item_kind }, created_at: row.created_at, updated_at: row.updated_at });
    return grouped;
  }, {});
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
  findAll, findById, findRawById, findParentById, findUomById,
  findItemsByIds, findLastBarcodeByYear, create, update,
  replaceComponents, deleteComponents, findVariantsByItemIds, findParentVariantAttributesByParentIds, findParentVariantAttributes, findVariantValuesByIds, findVariantValueByNameOrCode, findVariantValueByCode, nextVariantValueSortOrder, createVariantValue, replaceVariants, findDuplicateVariantCombination, transaction,
};