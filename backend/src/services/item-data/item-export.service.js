const ExportModel = require('../../models/item-data/item-export.model');
const DirectoryService = require('../pilargroup-directory.service');
const { createWorkbookBuffer } = require('../../utils/xlsx.util');

const DEFAULT_COLUMNS = [
  { key: 'business_unit', header: 'Business Unit' },
  { key: 'channel_name', header: 'Channel Name' },
  { key: 'category', header: 'Category' },
  { key: 'sku', header: 'SKU' },
  { key: 'parent_name', header: 'Parent Name' },
  { key: 'item_name', header: 'Item Name' },
];

const OPTIONAL_COLUMNS = [
  { key: 'main_category', header: 'Main Category' },
  { key: 'sub_category', header: 'Sub Category' },
  { key: 'brand_category', header: 'Brand Category' },
  { key: 'pic', header: 'PIC' },
  { key: 'item_created_date', header: 'Item Created Date' },
  { key: 'item_updated_date', header: 'Item Updated Date' },
  { key: 'port', header: 'Port' },
  { key: 'item_source', header: 'Item Source' },
  { key: 'selling_name', header: 'Selling Name' },
  { key: 'uom', header: 'UOM' },
  { key: 'qty_per_pack', header: 'Qty/Pack' },
  { key: 'height', header: 'Height' },
  { key: 'width', header: 'Width' },
  { key: 'depth', header: 'Depth' },
  { key: 'gross_weight_pack', header: 'Gross Weight/Pack' },
  { key: 'lead_time', header: 'Lead Time' },
];

const ALLOWED_STATUSES = ['active', 'inactive'];

function makeError(message) {
  return Object.assign(new Error(message), { statusCode: 422 });
}

function normalizeStatus(value) {
  const status = String(value || 'active').trim().toLowerCase();
  if (!ALLOWED_STATUSES.includes(status)) {
    throw makeError('Status must be active or inactive');
  }
  return status;
}

function splitValues(value) {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeSelectedFields(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((entry) => splitValues(entry)))];
  }
  return [...new Set(splitValues(value))];
}

function selectedColumns(query = {}) {
  const requested = normalizeSelectedFields(query.fields ?? query.columns);
  const allowed = new Set(OPTIONAL_COLUMNS.map((column) => column.key));
  const unknown = requested.filter((field) => !allowed.has(field));

  if (unknown.length) {
    throw makeError(`Export fields are not allowed: ${unknown.join(', ')}`);
  }

  const requestedSet = new Set(requested);
  return [
    ...DEFAULT_COLUMNS,
    ...OPTIONAL_COLUMNS.filter((column) => requestedSet.has(column.key)),
  ];
}

function dateOnlyJakarta(value) {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function joinDirectoryNames(csvIds, directoryRows) {
  const ids = splitValues(csvIds);
  if (!ids.length) return '';

  const map = new Map(directoryRows.map((row) => [String(row.id), row]));
  const seen = new Set();
  const names = [];

  ids.forEach((id) => {
    const row = map.get(String(id));
    const name = String(row?.name || row?.code || '').trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  });

  return names.join(',');
}

function mapExportRow(row, businessUnits, users) {
  return {
    'Business Unit': joinDirectoryNames(row.business_unit_ids, businessUnits),
    'Channel Name': splitValues(row.channel_names).join(','),
    Category: row.detail_category || '',
    SKU: row.item_code || '',
    'Parent Name': row.parent_name || '',
    'Item Name': row.item_name || '',
    'Main Category': row.main_category || '',
    'Sub Category': row.sub_category || '',
    'Brand Category': row.brand_category || '',
    PIC: joinDirectoryNames(row.pic_user_ids, users),
    'Item Created Date': dateOnlyJakarta(row.created_at),
    'Item Updated Date': dateOnlyJakarta(row.updated_at),
    Port: splitValues(row.port_names).join(','),
    'Item Source': row.item_type_name || row.item_type_code || '',
    'Selling Name': row.selling_name || '',
    UOM: row.uom_name || row.uom_code || '',
    'Qty/Pack': row.qty_per_pack ?? '',
    Height: row.height ?? '',
    Width: row.width ?? '',
    Depth: row.depth ?? '',
    'Gross Weight/Pack': row.gross_weight_pack ?? '',
    'Lead Time': row.production_time_days ?? '',
  };
}

async function exportItems(query = {}) {
  const status = normalizeStatus(query.status);
  const columns = selectedColumns(query);
  const rows = await ExportModel.exportItems(status);

  const businessUnitIds = rows.flatMap((row) => splitValues(row.business_unit_ids));
  const selectedKeys = new Set(columns.map((column) => column.key));
  const picUserIds = selectedKeys.has('pic')
    ? rows.flatMap((row) => splitValues(row.pic_user_ids))
    : [];

  const [allBusinessUnits, allUsers] = await Promise.all([
    businessUnitIds.length ? DirectoryService.getBusinessUnits() : Promise.resolve([]),
    picUserIds.length ? DirectoryService.getUsers() : Promise.resolve([]),
  ]);

  const businessUnits = businessUnitIds.length
    ? DirectoryService.findBusinessUnitsByIds(allBusinessUnits, businessUnitIds)
    : [];
  const users = picUserIds.length
    ? DirectoryService.findUsersByIds(allUsers, picUserIds)
    : [];

  const mappedRows = rows.map((row) => mapExportRow(row, businessUnits, users));
  const headers = columns.map((column) => column.header);

  return {
    filename: `items-${status}.xlsx`,
    buffer: await createWorkbookBuffer([
      {
        name: status === 'active' ? 'Active Items' : 'Inactive Items',
        headers,
        rows: mappedRows,
      },
    ]),
  };
}

module.exports = {
  exportItems,
  DEFAULT_COLUMNS,
  OPTIONAL_COLUMNS,
};
