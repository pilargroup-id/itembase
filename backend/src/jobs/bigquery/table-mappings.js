function field(name, type) {
  return { name, type, mode: 'NULLABLE' };
}

const mariadbMappings = [
  {
    sourceTable: 'items',
    targetTable: 'raw_items',
    fields: [
      field('id', 'STRING'),
      field('item_code', 'STRING'),
      field('barcode', 'STRING'),
      field('item_name', 'STRING'),
      field('selling_name', 'STRING'),
      field('item_kind', 'STRING'),
      field('parent_id', 'STRING'),
      field('uom_id', 'STRING'),
      field('qty_per_pack', 'NUMERIC'),
      field('height', 'NUMERIC'),
      field('width', 'NUMERIC'),
      field('depth', 'NUMERIC'),
      field('gross_weight_pack', 'NUMERIC'),
      field('production_time_days', 'NUMERIC'),
      field('is_active', 'BOOL'),
      field('created_by', 'STRING'),
      field('updated_by', 'STRING'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'item_parents',
    targetTable: 'raw_item_parents',
    fields: [
      field('id', 'STRING'),
      field('subbrand_id', 'STRING'),
      field('parent_code', 'STRING'),
      field('brand_id', 'STRING'),
      field('sub_brand', 'STRING'),
      field('item_name', 'STRING'),
      field('category_id', 'STRING'),
      field('item_type_id', 'STRING'),
      field('parent_name', 'STRING'),
      field('status', 'STRING'),
      field('created_by', 'STRING'),
      field('updated_by', 'STRING'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'item_bundle_components',
    targetTable: 'raw_item_bundle_components',
    fields: [
      field('id', 'STRING'),
      field('bundle_item_id', 'STRING'),
      field('component_item_id', 'STRING'),
      field('qty', 'NUMERIC'),
      field('sort_order', 'INT64'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'item_parent_ports',
    targetTable: 'raw_item_parent_ports',
    fields: [
      field('id', 'STRING'),
      field('item_parent_id', 'STRING'),
      field('port_id', 'STRING'),
      field('is_primary', 'BOOL'),
      field('sort_order', 'INT64'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'item_parent_variant_attributes',
    targetTable: 'raw_item_parent_variant_attributes',
    fields: [
      field('id', 'STRING'),
      field('item_parent_id', 'STRING'),
      field('attribute_id', 'STRING'),
      field('sort_order', 'INT64'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'item_variant_values',
    targetTable: 'raw_item_variant_values',
    fields: [
      field('id', 'STRING'),
      field('item_id', 'STRING'),
      field('attribute_id', 'STRING'),
      field('variant_value_id', 'STRING'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_brands',
    targetTable: 'raw_master_brands',
    fields: [
      field('id', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_brand_channels',
    targetTable: 'raw_master_brand_channels',
    fields: [
      field('id', 'STRING'),
      field('brand_id', 'STRING'),
      field('business_unit_id', 'STRING'),
      field('department_id', 'INT64'),
      field('channel_name', 'STRING'),
      field('channel_code', 'STRING'),
      field('is_primary', 'BOOL'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_categories',
    targetTable: 'raw_master_categories',
    fields: [
      field('id', 'STRING'),
      field('detail_category', 'STRING'),
      field('sub_category', 'STRING'),
      field('main_category', 'STRING'),
      field('brand_category', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_category_users',
    targetTable: 'raw_master_category_users',
    fields: [
      field('id', 'STRING'),
      field('category_id', 'STRING'),
      field('central_user_id', 'STRING'),
      field('is_primary', 'BOOL'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_item_types',
    targetTable: 'raw_master_item_types',
    fields: [
      field('id', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_ports',
    targetTable: 'raw_master_ports',
    fields: [
      field('id', 'STRING'),
      field('country_code', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_subbrands',
    targetTable: 'raw_master_subbrands',
    fields: [
      field('id', 'STRING'),
      field('name', 'STRING'),
      field('normalized_name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_subbrand_items',
    targetTable: 'raw_master_subbrand_items',
    fields: [
      field('id', 'STRING'),
      field('subbrand_id', 'STRING'),
      field('item_parent_id', 'STRING'),
      field('item_name', 'STRING'),
      field('normalized_item_name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_uoms',
    targetTable: 'raw_master_uoms',
    fields: [
      field('id', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_variant_attributes',
    targetTable: 'raw_master_variant_attributes',
    fields: [
      field('id', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  {
    sourceTable: 'master_variant_values',
    targetTable: 'raw_master_variant_values',
    fields: [
      field('id', 'STRING'),
      field('attribute_id', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('sort_order', 'INT64'),
      field('is_active', 'BOOL'),
      field('created_at', 'DATETIME'),
      field('updated_at', 'DATETIME'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
];

const directoryMappings = {
  productUsers: {
    targetTable: 'dim_product_users',
    fields: [
      field('id', 'STRING'),
      field('username', 'STRING'),
      field('email', 'STRING'),
      field('name', 'STRING'),
      field('job_position', 'STRING'),
      field('department_id', 'INT64'),
      field('department_name', 'STRING'),
      field('department_code', 'STRING'),
      field('is_active', 'BOOL'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  businessUnits: {
    targetTable: 'dim_business_units',
    fields: [
      field('id', 'STRING'),
      field('code', 'STRING'),
      field('name', 'STRING'),
      field('is_active', 'BOOL'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
  businessUnitDepartments: {
    targetTable: 'dim_business_unit_departments',
    fields: [
      field('business_unit_id', 'STRING'),
      field('department_id', 'INT64'),
      field('department_code', 'STRING'),
      field('department_name', 'STRING'),
      field('is_primary', 'BOOL'),
      field('is_active', 'BOOL'),
      field('_synced_at', 'TIMESTAMP'),
    ],
  },
};

function getSourceFields(mapping) {
  return mapping.fields.filter((item) => item.name !== '_synced_at');
}

function buildMariaDbSelect(mapping) {
  const selectedFields = getSourceFields(mapping).map((item) => {
    if (item.type === 'DATETIME') {
      return `DATE_FORMAT(\`${item.name}\`, '%Y-%m-%d %H:%i:%s') AS \`${item.name}\``;
    }

    return `\`${item.name}\``;
  });

  return `SELECT\n  ${selectedFields.join(',\n  ')}\nFROM \`${mapping.sourceTable}\``;
}

function normalizeValue(value, type) {
  if (value === undefined || value === null) return null;

  if (type === 'BOOL') {
    if (typeof value === 'boolean') return value;
    return Number(value) === 1;
  }

  if (type === 'INT64') {
    return Number(value);
  }

  if (type === 'NUMERIC') {
    return String(value);
  }

  return value;
}

function normalizeRow(row, fields, syncedAt) {
  const output = {};

  for (const item of fields) {
    if (item.name === '_synced_at') {
      output[item.name] = syncedAt;
      continue;
    }

    output[item.name] = normalizeValue(row[item.name], item.type);
  }

  return output;
}

function allTargetTableNames() {
  return [
    ...mariadbMappings.map((mapping) => mapping.targetTable),
    ...Object.values(directoryMappings).map((mapping) => mapping.targetTable),
  ];
}

module.exports = {
  mariadbMappings,
  directoryMappings,
  buildMariaDbSelect,
  normalizeRow,
  allTargetTableNames,
};
