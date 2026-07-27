const ItemParentModel = require('../../models/item/item-parent.model');
const ItemModel = require('../../models/item/item.model');
const { createXlsxBuffer } = require('../../utils/xlsx.util');

const DOWNLOAD_TYPES = {
  parent: {
    sheetName: 'Parent',
    filename: 'item-parent.xlsx',
  },
  items: {
    sheetName: 'Items',
    filename: 'items.xlsx',
  },
  bundles: {
    sheetName: 'Bundles',
    filename: 'bundles.xlsx',
  },
};

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function formatDate(value) {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function boolLabel(value) {
  if (value === null || value === undefined || value === '') return '';

  return Number(value) ? 'Active' : 'Inactive';
}

async function getAllPages(fetcher, query = {}) {
  const firstPage = await fetcher({ ...query, page: 1, limit: 250 });
  const rows = [...firstPage.data];
  const totalPages = firstPage.meta?.totalPages || firstPage.meta?.total_page || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetcher({ ...query, page, limit: 250 });
    rows.push(...result.data);
  }

  return rows;
}

function parentRows(rows) {
  return rows.map((row) => ({
    'Parent Code': row.parent_code,
    'Parent Name': row.parent_name,
    'Sub Brand': row.sub_brand || row.subbrand?.name || '',
    Brand: row.brand?.name || '',
    'Brand Code': row.brand?.code || '',
    'Detail Category': row.category?.detail_category || '',
    'Sub Category': row.category?.sub_category || '',
    'Main Category': row.category?.main_category || '',
    'Brand Category': row.category?.brand_category || '',
    'Item Type': row.item_type?.name || '',
    'Item Type Code': row.item_type?.code || '',
    Port: row.port?.name || '',
    'Port Code': row.port?.code || '',
    Status: row.status,
    'Created At': formatDate(row.created_at),
    'Updated At': formatDate(row.updated_at),
  }));
}

function channelSummary(item) {
  return (item.channels || [])
    .map((channel) => {
      const businessUnit = channel.business_unit_name || channel.business_unit_code || channel.business_unit_id || '';
      const department = channel.department_name || channel.department_code || channel.department_id || '';
      const name = channel.channel_name || channel.channel_code || '';

      return [businessUnit, department, name].filter(Boolean).join(' / ');
    })
    .filter(Boolean)
    .join('; ');
}

function componentSummary(item) {
  return (item.components || [])
    .map((component) => {
      const componentItem = component.item || {};
      const name = componentItem.item_name || componentItem.item_code || component.component_item_id || '';

      return `${component.qty} x ${name}`;
    })
    .filter(Boolean)
    .join('; ');
}

function itemRows(rows) {
  return rows.map((row) => ({
    'Item Code': row.item_code,
    Barcode: row.barcode,
    'Item Name': row.item_name,
    'Item Kind': row.item_kind,
    Variant: row.variant || '',
    'Parent Code': row.parent?.parent_code || '',
    'Parent Name': row.parent?.parent_name || '',
    Brand: row.parent?.brand?.name || '',
    'Detail Category': row.parent?.category?.detail_category || '',
    'Sub Category': row.parent?.category?.sub_category || '',
    'Main Category': row.parent?.category?.main_category || '',
    'Item Type': row.parent?.item_type?.name || '',
    Port: row.parent?.port?.name || '',
    UOM: row.uom?.name || '',
    'UOM Code': row.uom?.code || '',
    'SKU Status': row.sku_status?.name || '',
    'SKU Status Code': row.sku_status?.code || '',
    'Business Unit': row.business_unit?.name || row.business_unit?.code || row.business_unit?.id || '',
    Channels: channelSummary(row),
    'Qty Per Pack': row.qty_per_pack,
    Height: row.height,
    Width: row.width,
    Depth: row.depth,
    'Gross Weight Pack': row.gross_weight_pack,
    '20ft Qty': row.container_20ft_qty,
    '40hq Qty': row.container_40hq_qty,
    'Production Time Days': row.production_time_days,
    Status: boolLabel(row.is_active),
    'Created At': formatDate(row.created_at),
    'Updated At': formatDate(row.updated_at),
  }));
}

function bundleRows(rows) {
  return itemRows(rows).map((row, index) => ({
    ...row,
    Components: componentSummary(rows[index]),
  }));
}

async function exportXlsx(query = {}) {
  const downloadType = query.download;
  const config = DOWNLOAD_TYPES[downloadType];

  if (!config) {
    throw makeError('Download parameter must be one of: parent, items, bundles', 422, 'INVALID_DOWNLOAD_TYPE');
  }

  const exportQuery = { ...query };
  delete exportQuery.download;

  let rows;

  if (downloadType === 'parent') {
    rows = parentRows(await getAllPages(ItemParentModel.findAll, exportQuery));
  } else if (downloadType === 'bundles') {
    rows = bundleRows(await getAllPages(ItemModel.findAll, { ...exportQuery, item_kind: 'bundle' }));
  } else {
    rows = itemRows(await getAllPages(ItemModel.findAll, { ...exportQuery, item_kind: 'regular' }));
  }

  const headers = Object.keys(rows[0] || (
    downloadType === 'parent'
      ? parentRows([{}])[0]
      : downloadType === 'bundles'
        ? bundleRows([{}])[0]
        : itemRows([{}])[0]
  ));

  return {
    filename: config.filename,
    buffer: createXlsxBuffer({
      sheetName: config.sheetName,
      headers,
      rows,
    }),
  };
}

module.exports = {
  exportXlsx,
};
