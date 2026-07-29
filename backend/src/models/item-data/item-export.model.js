const { db } = require('../../config/database.config');

async function parents() {
  const [rows] = await db.query(`
    SELECT ip.parent_code, mb.code brand_code, ip.sub_brand subbrand_name, ip.item_name,
      mc.detail_category category_detail, mit.code item_type_code, ip.parent_name, ip.status,
      GROUP_CONCAT(DISTINCT mp.code ORDER BY ipp.is_primary DESC, ipp.sort_order SEPARATOR ';') ports,
      GROUP_CONCAT(DISTINCT mva.code ORDER BY ipva.sort_order SEPARATOR ';') variant_attributes,
      ip.created_at, ip.updated_at
    FROM item_parents ip
    LEFT JOIN master_brands mb ON mb.id=ip.brand_id
    INNER JOIN master_categories mc ON mc.id=ip.category_id
    LEFT JOIN master_item_types mit ON mit.id=ip.item_type_id
    LEFT JOIN item_parent_ports ipp ON ipp.item_parent_id=ip.id
    LEFT JOIN master_ports mp ON mp.id=ipp.port_id
    LEFT JOIN item_parent_variant_attributes ipva ON ipva.item_parent_id=ip.id
    LEFT JOIN master_variant_attributes mva ON mva.id=ipva.attribute_id
    GROUP BY ip.id ORDER BY ip.parent_code
  `);
  return rows;
}

async function items(kind) {
  const [rows] = await db.query(`
    SELECT i.id,i.item_code,i.barcode,i.item_name,i.selling_name,i.item_kind,
      ip.parent_code,mu.code uom_code,i.qty_per_pack,i.height,i.width,i.depth,
      i.gross_weight_pack,i.production_time_days,i.is_active,
      GROUP_CONCAT(DISTINCT CONCAT(mva.code,'=',mvv.code) ORDER BY mva.code SEPARATOR ';') variants,
      i.created_at,i.updated_at
    FROM items i
    LEFT JOIN item_parents ip ON ip.id=i.parent_id
    LEFT JOIN master_uoms mu ON mu.id=i.uom_id
    LEFT JOIN item_variant_values ivv ON ivv.item_id=i.id
    LEFT JOIN master_variant_attributes mva ON mva.id=ivv.attribute_id
    LEFT JOIN master_variant_values mvv ON mvv.id=ivv.variant_value_id
    WHERE i.item_kind=?
    GROUP BY i.id ORDER BY i.item_code
  `,[kind]);
  return rows;
}

async function bundleComponents() {
  const [rows] = await db.query(`
    SELECT b.item_code bundle_item_code,c.item_code component_item_code,ibc.qty,ibc.sort_order
    FROM item_bundle_components ibc
    INNER JOIN items b ON b.id=ibc.bundle_item_id
    INNER JOIN items c ON c.id=ibc.component_item_id
    ORDER BY b.item_code,ibc.sort_order
  `);
  return rows;
}

module.exports={parents,items,bundleComponents};
