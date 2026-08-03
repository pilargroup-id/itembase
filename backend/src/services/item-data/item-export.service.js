const ExportModel = require('../../models/item-data/item-export.model');
const { createWorkbookBuffer } = require('../../utils/xlsx.util');

const EXPORT_HEADERS = {
  parents: [
    'parent_code',
    'brand_code',
    'subbrand_name',
    'item_name',
    'category_detail',
    'item_type_code',
    'parent_name',
    'status',
    'ports',
    'variant_attributes',
    'created_at',
    'updated_at',
  ],
  items: [
    'item_code',
    'barcode',
    'item_name',
    'selling_name',
    'parent_code',
    'uom_code',
    'qty_per_pack',
    'height',
    'width',
    'depth',
    'gross_weight_pack',
    'production_time_days',
    'is_active',
    'variants',
    'created_at',
    'updated_at',
  ],
  bundles: [
    'item_code',
    'barcode',
    'item_name',
    'selling_name',
    'parent_code',
    'uom_code',
    'is_active',
    'created_at',
    'updated_at',
  ],
  bundleComponents: ['bundle_item_code', 'component_item_code', 'qty', 'sort_order'],
};

function dateText(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().replace('T', ' ').slice(0, 19);
}

function normalizeDates(rows) {
  return rows.map((row) => ({
    ...row,
    created_at: dateText(row.created_at),
    updated_at: dateText(row.updated_at),
  }));
}

function error(message) {
  return Object.assign(new Error(message), { statusCode: 422 });
}

function splitColumns(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitColumns(item));
  }

  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return [];
  }

  if (['none', 'null', '-'].includes(text.toLowerCase())) {
    return [];
  }

  return text
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

function selectHeaders(requestedColumns, allowedHeaders, label, allowEmpty = false) {
  const columns = splitColumns(requestedColumns);

  if (columns === null) {
    return allowedHeaders;
  }

  const unknownColumns = columns.filter((column) => !allowedHeaders.includes(column));

  if (unknownColumns.length > 0) {
    throw error(`${label} columns are not allowed: ${unknownColumns.join(', ')}`);
  }

  const selectedHeaders = allowedHeaders.filter((header) => columns.includes(header));

  if (!allowEmpty && selectedHeaders.length === 0) {
    throw error(`${label} export needs at least one column`);
  }

  return selectedHeaders;
}

async function exportType(type, query = {}) {
  if (type === 'parents') {
    const rows = normalizeDates(await ExportModel.parents());
    const headers = selectHeaders(query.columns, EXPORT_HEADERS.parents, 'Parent');
    return { filename: 'item-parents.xlsx', buffer: await createWorkbookBuffer([{ name: 'Parents', headers, rows }]) };
  }

  if (type === 'items') {
    const rows = normalizeDates(await ExportModel.items('regular'));
    const headers = selectHeaders(query.columns, EXPORT_HEADERS.items, 'Item');
    return { filename: 'regular-items.xlsx', buffer: await createWorkbookBuffer([{ name: 'Items', headers, rows }]) };
  }

  if (type === 'bundles') {
    const bundleHeaders = selectHeaders(query.columns, EXPORT_HEADERS.bundles, 'Bundle', true);
    const componentHeaders = selectHeaders(
      query.component_columns,
      EXPORT_HEADERS.bundleComponents,
      'Bundle component',
      true,
    );
    const sheets = [];

    if (bundleHeaders.length > 0) {
      sheets.push({
        name: 'Bundles',
        headers: bundleHeaders,
        rows: normalizeDates(await ExportModel.items('bundle')),
      });
    }

    if (componentHeaders.length > 0) {
      sheets.push({
        name: 'Bundle Components',
        headers: componentHeaders,
        rows: await ExportModel.bundleComponents(),
      });
    }

    if (sheets.length === 0) {
      throw error('Bundle export needs at least one column');
    }

    return { filename: 'bundles.xlsx', buffer: await createWorkbookBuffer(sheets) };
  }

  throw error('Export type must be parents, items, or bundles');
}

module.exports = { exportType, EXPORT_HEADERS };
