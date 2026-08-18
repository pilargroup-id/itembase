const { db } = require('../../config/database.config');

function normalizeInactiveStatus(status = 'active') {
  return String(status || 'active').trim().toLowerCase() === 'inactive' ? 0 : 1;
}

async function exportItems(status = 'active') {
  const isActive = normalizeInactiveStatus(status);

  const [rows] = await db.query(`
    SELECT
      i.id,
      i.item_code,
      i.item_name,
      i.selling_name,
      i.qty_per_pack,
      i.height,
      i.width,
      i.depth,
      i.gross_weight_pack,
      i.production_time_days,
      i.is_active,
      i.created_at,
      i.updated_at,
      ip.parent_code,
      ip.parent_name,
      mb.id AS brand_id,
      mc.id AS category_id,
      mc.detail_category,
      mc.sub_category,
      mc.main_category,
      mc.brand_category,
      mit.code AS item_type_code,
      mit.name AS item_type_name,
      mu.code AS uom_code,
      mu.name AS uom_name,
      GROUP_CONCAT(
        DISTINCT mbc.business_unit_id
        ORDER BY mbc.is_primary DESC, mbc.business_unit_id
        SEPARATOR ','
      ) AS business_unit_ids,
      GROUP_CONCAT(
        DISTINCT NULLIF(TRIM(mbc.channel_name), '')
        ORDER BY mbc.is_primary DESC, mbc.channel_name
        SEPARATOR ','
      ) AS channel_names,
      GROUP_CONCAT(
        DISTINCT mcu.central_user_id
        ORDER BY mcu.is_primary DESC, mcu.central_user_id
        SEPARATOR ','
      ) AS pic_user_ids,
      GROUP_CONCAT(
        DISTINCT mp.name
        ORDER BY ipp.is_primary DESC, ipp.sort_order, mp.name
        SEPARATOR ','
      ) AS port_names
    FROM items i
    LEFT JOIN item_parents ip ON ip.id = i.parent_id
    LEFT JOIN master_brands mb ON mb.id = ip.brand_id
    LEFT JOIN master_categories mc ON mc.id = ip.category_id
    LEFT JOIN master_item_types mit ON mit.id = ip.item_type_id
    LEFT JOIN master_uoms mu ON mu.id = i.uom_id
    LEFT JOIN master_brand_channels mbc
      ON mbc.brand_id = ip.brand_id
      AND mbc.is_active = 1
    LEFT JOIN master_category_users mcu
      ON mcu.category_id = ip.category_id
      AND mcu.is_active = 1
    LEFT JOIN item_parent_ports ipp ON ipp.item_parent_id = ip.id
    LEFT JOIN master_ports mp ON mp.id = ipp.port_id
    WHERE i.is_active = ?
    GROUP BY
      i.id,
      i.item_code,
      i.item_name,
      i.selling_name,
      i.qty_per_pack,
      i.height,
      i.width,
      i.depth,
      i.gross_weight_pack,
      i.production_time_days,
      i.is_active,
      i.created_at,
      i.updated_at,
      ip.parent_code,
      ip.parent_name,
      mb.id,
      mc.id,
      mc.detail_category,
      mc.sub_category,
      mc.main_category,
      mc.brand_category,
      mit.code,
      mit.name,
      mu.code,
      mu.name
    ORDER BY i.item_code ASC
  `, [isActive]);

  return rows;
}

module.exports = {
  exportItems,
};
