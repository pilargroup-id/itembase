const ItemDataModel = require('../../models/item-data/item-data.model');
const PreviewStorage = require('./preview-storage.service');
const { readWorkbook, worksheetToObjects, createWorkbookBuffer } = require('../../utils/xlsx.util');

const NULL_MARKER = 'NULL';
const PARENT_HEADERS = ['Parent ID','Brand','Sub Brand','Item Name','Category Detail','Item Source','Ports Code','Variant Attribute','Status'];
const ITEM_HEADERS = ['SKU ID','SKU Name','Parent ID','UOM Code','Qty/Pack','Height','Width','Depth','Gross Weight/Pack','Lead Time','Variant Attribute Value','Status'];
const BUNDLE_HEADERS = ['SKU ID','Selling Name','Parent ID','Status'];
const COMPONENT_HEADERS = ['SKU ID Bundle','SKU ID Component','Qty','Sort Order'];

const PARENT_MAP = {
  'Parent ID':'parent_code', Brand:'brand_name', 'Sub Brand':'subbrand_name', 'Item Name':'item_name',
  'Category Detail':'category_detail', 'Item Source':'item_source', 'Ports Code':'ports',
  'Variant Attribute':'variant_attributes', Status:'status',
};
const ITEM_MAP = {
  'SKU ID':'item_code', 'SKU Name':'item_name', 'Parent ID':'parent_code', 'UOM Code':'uom_code',
  'Qty/Pack':'qty_per_pack', Height:'height', Width:'width', Depth:'depth', 'Gross Weight/Pack':'gross_weight_pack',
  'Lead Time':'production_time_days', 'Variant Attribute Value':'variants', Status:'is_active',
};
const BUNDLE_MAP = { 'SKU ID':'item_code', 'Selling Name':'selling_name', 'Parent ID':'parent_code', Status:'is_active' };
const COMPONENT_MAP = { 'SKU ID Bundle':'bundle_item_code', 'SKU ID Component':'component_item_code', Qty:'qty', 'Sort Order':'sort_order' };

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function hasOwn(row, field) { return Object.prototype.hasOwnProperty.call(row, field); }
function supplied(row, field) { return hasOwn(row, field) && text(row[field]) !== ''; }
function isNull(value) { return text(value).toUpperCase() === NULL_MARKER; }
function splitList(value) { return text(value).split(';').map((v) => v.trim()).filter(Boolean); }
function error(message, code = 'VALIDATION_ERROR') { return { code, message }; }
function toBool(value) {
  const normalized = text(value).toLowerCase();
  if (['1','true','active','yes'].includes(normalized)) return 1;
  if (['0','false','inactive','no'].includes(normalized)) return 0;
  return null;
}
function toNumber(value, integer = false) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (integer && !Number.isInteger(n))) return null;
  return n;
}
function parentStatus(value) {
  const v = text(value).toLowerCase();
  return ['draft','active','inactive','discontinued'].includes(v) ? v : null;
}
function rowResult(row, action, errors = [], normalized = null) {
  return { source_row: row._source_row, action, status: errors.length ? 'INVALID' : 'VALID', errors, normalized, original: row };
}
function currentYear2() { return String(new Date().getFullYear()).slice(-2); }
function remap(row, mapping) {
  const out = { _source_row: row._source_row };
  Object.entries(mapping).forEach(([header, key]) => { if (Object.prototype.hasOwnProperty.call(row, header)) out[key] = row[header]; });
  return out;
}
function buildParentName(brandName, subBrand, itemName) {
  return [brandName, subBrand, itemName].map((v) => text(v)).filter(Boolean).join(' ').toUpperCase();
}
function isExampleRow(type, row) {
  const first = type === 'parents' ? row.parent_code : row.item_code;
  return /^EXAMPLE_/i.test(text(first));
}

async function resolveParentReferences(row, errors) {
  const out = {};
  if (supplied(row, 'brand_name')) {
    if (isNull(row.brand_name)) errors.push(error('Brand cannot be cleared', 'FIELD_NOT_NULLABLE'));
    else {
      const found = await ItemDataModel.findBrandByNameOrCode(text(row.brand_name));
      if (!found || !Number(found.is_active)) errors.push(error(`Brand ${text(row.brand_name)} not found or inactive`, 'REFERENCE_NOT_FOUND'));
      else { out.brand_id = found.id; out.brand_name = found.name; }
    }
  }
  if (supplied(row, 'category_detail')) {
    if (isNull(row.category_detail)) errors.push(error('Category Detail cannot be cleared', 'FIELD_NOT_NULLABLE'));
    else {
      const found = await ItemDataModel.findByCode('category', text(row.category_detail));
      if (!found || !Number(found.is_active)) errors.push(error(`Category ${text(row.category_detail)} not found or inactive`, 'REFERENCE_NOT_FOUND'));
      else out.category_id = found.id;
    }
  }
  if (supplied(row, 'item_source')) {
    if (isNull(row.item_source)) out.item_type_id = null;
    else {
      const found = await ItemDataModel.findItemTypeByNameOrCode(text(row.item_source));
      if (!found || !Number(found.is_active)) errors.push(error(`Item Source ${text(row.item_source)} not found or inactive`, 'REFERENCE_NOT_FOUND'));
      else out.item_type_id = found.id;
    }
  }
  if (supplied(row, 'subbrand_name')) {
    if (isNull(row.subbrand_name)) { out.subbrand_id = null; out.sub_brand = null; }
    else {
      const found = await ItemDataModel.findSubbrandByName(text(row.subbrand_name));
      out.subbrand_id = found?.id || null;
      out.sub_brand = text(row.subbrand_name);
      out.create_subbrand = !found;
    }
  }
  if (supplied(row, 'ports')) {
    if (isNull(row.ports)) out.ports = [];
    else {
      out.ports = [];
      for (const code of splitList(row.ports)) {
        const found = await ItemDataModel.findByCode('port', code);
        if (!found || !Number(found.is_active)) errors.push(error(`Port ${code} not found or inactive`, 'REFERENCE_NOT_FOUND'));
        else out.ports.push(found);
      }
    }
  }
  if (supplied(row, 'variant_attributes')) {
    if (isNull(row.variant_attributes)) out.variant_attributes = [];
    else {
      out.variant_attributes = [];
      for (const code of splitList(row.variant_attributes)) {
        const found = await ItemDataModel.findByCode('variant_attribute', code);
        if (!found || !Number(found.is_active)) errors.push(error(`Variant Attribute ${code} not found or inactive`, 'REFERENCE_NOT_FOUND'));
        else out.variant_attributes.push(found);
      }
    }
  }
  return out;
}

async function validateParentRow(row) {
  const errors = [];
  const code = text(row.parent_code);
  if (!/^P\d{6}$/.test(code)) return rowResult(row, 'UNKNOWN', [error('Parent ID must use format P followed by 6 digits', 'INVALID_CODE_FORMAT')]);
  const existing = await ItemDataModel.findParentByCode(code);
  const action = existing ? 'UPDATE' : 'CREATE';
  const last = await ItemDataModel.findLastParentCode();
  if (!existing && last && Number(code.slice(1)) <= Number(last.parent_code.slice(1))) errors.push(error(`New Parent ID must be greater than current last code ${last.parent_code}`, 'INVALID_SEQUENCE'));

  const mandatory = ['brand_name','subbrand_name','item_name','category_detail','item_source'];
  if (!existing) mandatory.forEach((field) => { if (!supplied(row, field) || isNull(row[field])) errors.push(error(`${field} is required for create`, 'REQUIRED_FIELD')); });

  const refs = await resolveParentReferences(row, errors);
  const fields = { ...refs };
  if (supplied(row, 'item_name')) {
    if (isNull(row.item_name)) errors.push(error('Item Name cannot be cleared', 'FIELD_NOT_NULLABLE'));
    else fields.item_name = text(row.item_name);
  }
  if (supplied(row, 'status')) {
    if (isNull(row.status)) errors.push(error('Status cannot be cleared'));
    else {
      fields.status = parentStatus(row.status);
      if (!fields.status) errors.push(error('Status must be Draft, Active, Inactive, or Discontinued'));
    }
  } else if (!existing) fields.status = 'active';

  const finalBrandId = fields.brand_id ?? existing?.brand_id;
  const finalSubBrand = fields.sub_brand ?? existing?.sub_brand;
  const finalItemName = fields.item_name ?? existing?.item_name;
  const finalBrandName = fields.brand_name || (finalBrandId ? (await ItemDataModel.findBrandByNameOrCode(finalBrandId))?.name : null);
  if (finalBrandId && finalSubBrand && finalItemName) {
    let brand = fields.brand_name ? { name: fields.brand_name } : null;
    if (!brand) {
      const { db } = require('../../config/database.config');
      const [rows] = await db.query('SELECT name FROM master_brands WHERE id=? LIMIT 1', [finalBrandId]);
      brand = rows[0] || null;
    }
    fields.parent_name = buildParentName(brand?.name, finalSubBrand, finalItemName);
    const duplicate = await ItemDataModel.findParentDuplicateCombination(finalBrandId, finalSubBrand, finalItemName, existing?.id || null);
    if (duplicate) errors.push(error(`Parent combination already exists on ${duplicate.parent_code}`, 'DUPLICATE_PARENT_COMBINATION'));
  }
  delete fields.brand_name;
  if (existing && !Object.keys(fields).length) errors.push(error('No fields supplied for update', 'NO_CHANGES'));
  return rowResult(row, action, errors, { code, existing_id: existing?.id || null, fields, combination_key: `${finalBrandId || ''}|${text(finalSubBrand).toUpperCase()}|${text(finalItemName).toUpperCase()}` });
}

async function resolveItemReferences(row, errors, kind = 'regular') {
  const out = {};
  if (supplied(row, 'parent_code')) {
    if (isNull(row.parent_code)) errors.push(error('Parent ID cannot be cleared', 'FIELD_NOT_NULLABLE'));
    else {
      const parent = await ItemDataModel.findParentByCode(text(row.parent_code));
      if (!parent) errors.push(error(`Parent ${text(row.parent_code)} not found`, 'REFERENCE_NOT_FOUND'));
      else out.parent_id = parent.id;
    }
  }
  if (kind === 'bundle') {
    const uom = await ItemDataModel.findByCode('uom', 'SET');
    if (!uom || !Number(uom.is_active)) errors.push(error('Active UOM code SET is required for bundle import', 'REFERENCE_NOT_FOUND'));
    else out.uom_id = uom.id;
  } else if (supplied(row, 'uom_code')) {
    if (isNull(row.uom_code)) errors.push(error('UOM Code cannot be cleared', 'FIELD_NOT_NULLABLE'));
    else {
      const uom = await ItemDataModel.findByCode('uom', text(row.uom_code));
      if (!uom || !Number(uom.is_active)) errors.push(error(`UOM ${text(row.uom_code)} not found or inactive`, 'REFERENCE_NOT_FOUND'));
      else out.uom_id = uom.id;
    }
  }
  return out;
}

async function resolveVariants(value, errors) {
  if (isNull(value)) return [];
  const variants = [];
  const attributes = new Set();
  for (const part of splitList(value)) {
    const pieces = part.split('=').map((v) => v.trim());
    if (pieces.length !== 2 || !pieces[0] || !pieces[1]) { errors.push(error(`Invalid variant format: ${part}`)); continue; }
    const [attributeCode, valueCode] = pieces;
    if (attributes.has(attributeCode.toUpperCase())) { errors.push(error(`Duplicate variant attribute ${attributeCode}`)); continue; }
    attributes.add(attributeCode.toUpperCase());
    const found = await ItemDataModel.findVariantValue(attributeCode, valueCode);
    if (!found || !Number(found.is_active)) errors.push(error(`Variant ${attributeCode}=${valueCode} not found or inactive`, 'REFERENCE_NOT_FOUND'));
    else variants.push({ attribute_id: found.attribute_id, value_id: found.id, attribute_code: attributeCode, value_code: valueCode });
  }
  return variants;
}

async function validateItemRow(row, kind = 'regular') {
  const errors = [];
  const code = text(row.item_code);
  const prefix = `68${currentYear2()}`;
  const existing = await ItemDataModel.findItemByCode(code);
  const action = existing ? 'UPDATE' : 'CREATE';
  if (!/^68\d{10}$/.test(code)) errors.push(error('SKU ID must contain exactly 12 digits and start with 68', 'INVALID_CODE_FORMAT'));
  if (!existing && !code.startsWith(prefix)) errors.push(error(`New SKU ID must use current year prefix ${prefix}`, 'INVALID_ITEM_YEAR'));
  if (existing && existing.item_kind !== kind) errors.push(error(`Existing item is ${existing.item_kind}; SKU Type cannot be changed`, 'ITEM_KIND_IMMUTABLE'));

  const required = kind === 'regular' ? ['item_name','parent_code','uom_code'] : ['parent_code'];
  if (!existing) required.forEach((field) => { if (!supplied(row, field) || isNull(row[field])) errors.push(error(`${field} is required for create`, 'REQUIRED_FIELD')); });
  const fields = await resolveItemReferences(row, errors, kind);

  if (kind === 'regular') {
    if (supplied(row, 'item_name')) {
      if (isNull(row.item_name)) errors.push(error('SKU Name cannot be cleared', 'FIELD_NOT_NULLABLE'));
      else { fields.item_name = text(row.item_name); fields.selling_name = text(row.item_name); }
    }
    if (supplied(row, 'variants')) fields.variants = await resolveVariants(row.variants, errors);
    for (const field of ['qty_per_pack','height','width','depth','gross_weight_pack']) {
      if (!supplied(row, field)) continue;
      fields[field] = isNull(row[field]) ? null : toNumber(row[field]);
      if (!isNull(row[field]) && fields[field] === null) errors.push(error(`${field} must be a non-negative number`));
    }
    if (supplied(row, 'production_time_days')) {
      fields.production_time_days = isNull(row.production_time_days) ? null : toNumber(row.production_time_days, true);
      if (!isNull(row.production_time_days) && fields.production_time_days === null) errors.push(error('Lead Time must be a non-negative integer'));
    }
  } else if (supplied(row, 'selling_name')) {
    fields.selling_name = isNull(row.selling_name) ? null : text(row.selling_name);
  }

  if (supplied(row, 'is_active')) {
    if (isNull(row.is_active)) errors.push(error('Status cannot be cleared'));
    else {
      fields.is_active = toBool(row.is_active);
      if (fields.is_active === null) errors.push(error('Status must be Active or Inactive'));
    }
  }
  if (!existing && fields.is_active === undefined) fields.is_active = 1;
  if (existing && !Object.keys(fields).length) errors.push(error('No fields supplied for update', 'NO_CHANGES'));
  return rowResult(row, action, errors, { code, existing_id: existing?.id || null, fields, kind });
}

async function validateBundleRows(bundleRows, componentRows) {
  const componentsByCode = new Map();
  componentRows.forEach((row) => {
    if (/^EXAMPLE_/i.test(text(row.bundle_item_code))) return;
    const code = text(row.bundle_item_code);
    if (!componentsByCode.has(code)) componentsByCode.set(code, []);
    componentsByCode.get(code).push(row);
  });
  const results = [];
  for (const row of bundleRows) {
    if (isExampleRow('bundles', row)) continue;
    const result = await validateItemRow(row, 'bundle');
    const componentSource = componentsByCode.get(text(row.item_code)) || [];
    const resolved = [];
    if (componentSource.length < 1) result.errors.push(error('Bundle must have at least 1 component', 'BUNDLE_COMPONENT_REQUIRED'));
    if (componentSource.length > 5) result.errors.push(error('Bundle can have maximum 5 components', 'BUNDLE_COMPONENT_LIMIT'));
    const seen = new Set();
    for (const component of componentSource) {
      const componentCode = text(component.component_item_code);
      if (seen.has(componentCode)) { result.errors.push(error(`Duplicate component ${componentCode}`)); continue; }
      seen.add(componentCode);
      const item = await ItemDataModel.findItemByCode(componentCode);
      if (!item) result.errors.push(error(`Component ${componentCode} not found`, 'REFERENCE_NOT_FOUND'));
      else if (item.item_kind !== 'regular') result.errors.push(error(`Component ${componentCode} must be a regular item`, 'INVALID_BUNDLE_COMPONENT'));
      const qty = toNumber(component.qty);
      if (qty === null || qty <= 0) result.errors.push(error(`Component ${componentCode} qty must be greater than 0`));
      else if (componentSource.length === 1 && qty <= 1) result.errors.push(error(`Component ${componentCode} qty must be greater than 1 when bundle only has 1 component`));
      const sortOrder = supplied(component, 'sort_order') ? toNumber(component.sort_order, true) : resolved.length + 1;
      if (sortOrder === null || sortOrder < 1) result.errors.push(error(`Component ${componentCode} Sort Order must be a positive integer`));
      const validQty = qty !== null && qty > 0 && (componentSource.length > 1 || qty > 1);
      if (item && item.item_kind === 'regular' && validQty && sortOrder >= 1) resolved.push({ item_id: item.id, item_code: item.item_code, item_name: item.item_name, qty, sort_order: sortOrder });
    }
    result.original_components = componentSource;
    if (componentSource.length && result.errors.some((entry) => entry.code === 'NO_CHANGES')) result.errors = result.errors.filter((entry) => entry.code !== 'NO_CHANGES');
    if (!result.errors.length) {
      result.normalized.fields.components = resolved;
      result.normalized.fields.item_name = `BUNDLE ${resolved.sort((a,b) => a.sort_order-b.sort_order).map((c) => `${Number(c.qty)} ${c.item_name}`).join(' + ')}`;
      if (!result.normalized.fields.selling_name) result.normalized.fields.selling_name = result.normalized.fields.item_name;
    }
    result.status = result.errors.length ? 'INVALID' : 'VALID';
    results.push(result);
  }
  return results;
}

async function parse(type, buffer) {
  const workbook = await readWorkbook(buffer);
  if (type === 'parents') return worksheetToObjects(workbook.getWorksheet('Parents')).map((r) => remap(r, PARENT_MAP));
  if (type === 'items') return worksheetToObjects(workbook.getWorksheet('Items')).map((r) => remap(r, ITEM_MAP));
  if (type === 'bundles') return {
    bundles: worksheetToObjects(workbook.getWorksheet('Bundles')).map((r) => remap(r, BUNDLE_MAP)),
    components: worksheetToObjects(workbook.getWorksheet('Bundle Components')).map((r) => remap(r, COMPONENT_MAP)),
  };
  throw Object.assign(new Error('Import type must be parents, items, or bundles'), { statusCode: 422 });
}

async function preview(type, buffer, userId) {
  await PreviewStorage.cleanupExpired();
  const parsed = await parse(type, buffer);
  let results = [];
  if (type === 'parents') for (const row of parsed) if (!isExampleRow(type, row)) results.push(await validateParentRow(row));
  if (type === 'items') for (const row of parsed) if (!isExampleRow(type, row)) results.push(await validateItemRow(row, 'regular'));
  if (type === 'bundles') results = await validateBundleRows(parsed.bundles, parsed.components);

  const duplicateCodes = new Set();
  const seen = new Set();
  results.forEach((row) => { const code = row.normalized?.code || ''; if (seen.has(code)) duplicateCodes.add(code); seen.add(code); });
  results.forEach((row) => { if (duplicateCodes.has(row.normalized?.code)) { row.errors.push(error('Duplicate pivot code in uploaded file', 'DUPLICATE_FILE_CODE')); row.status='INVALID'; } });

  if (type === 'parents') {
    const combos = new Map();
    results.forEach((row) => {
      const key = row.normalized?.combination_key;
      if (!key) return;
      if (combos.has(key)) {
        row.errors.push(error('Duplicate Brand + Sub Brand + Item Name combination in uploaded file', 'DUPLICATE_PARENT_COMBINATION'));
        row.status = 'INVALID';
        const first = combos.get(key);
        first.errors.push(error('Duplicate Brand + Sub Brand + Item Name combination in uploaded file', 'DUPLICATE_PARENT_COMBINATION'));
        first.status = 'INVALID';
      } else combos.set(key, row);
    });
  }

  const record = await PreviewStorage.save({ type, user_id: userId, rows: results });
  return {
    preview_token: record.token,
    expires_at: record.expires_at,
    summary: { total: results.length, valid: results.filter((r) => r.status === 'VALID').length, invalid: results.filter((r) => r.status === 'INVALID').length },
    rows: results.map(({ normalized, ...row }) => row),
  };
}

async function applyParent(normalized, userId) {
  return ItemDataModel.transaction(async (connection) => {
    const existing = await ItemDataModel.findParentByCode(normalized.code, connection);
    const fields = { ...normalized.fields };
    if (fields.create_subbrand) {
      const subbrand = await ItemDataModel.createSubbrand(fields.sub_brand, connection);
      fields.subbrand_id = subbrand.id;
      delete fields.create_subbrand;
    }
    const ports = fields.ports; delete fields.ports;
    const attributes = fields.variant_attributes; delete fields.variant_attributes;
    let id = existing?.id;
    if (!existing) id = await ItemDataModel.insertParent({ parent_code: normalized.code, ...fields, user_id: userId }, connection);
    else await ItemDataModel.patchParent(id, fields, userId, connection);
    if (ports !== undefined) await ItemDataModel.replaceParentPorts(id, ports, connection);
    if (attributes !== undefined) await ItemDataModel.replaceParentAttributes(id, attributes, connection);
  });
}

async function applyItem(normalized, userId) {
  return ItemDataModel.transaction(async (connection) => {
    const existing = await ItemDataModel.findItemByCode(normalized.code, connection);
    const fields = { ...normalized.fields };
    const variants = fields.variants; delete fields.variants;
    const components = fields.components; delete fields.components;
    let id = existing?.id;
    if (!existing) id = await ItemDataModel.insertItem({ item_code: normalized.code, barcode: normalized.code, item_kind: normalized.kind, selling_name: fields.selling_name || fields.item_name, ...fields, user_id: userId }, connection);
    else await ItemDataModel.patchItem(id, fields, userId, connection);
    if (variants !== undefined) await ItemDataModel.replaceItemVariants(id, variants, connection);
    if (components !== undefined) await ItemDataModel.replaceBundleComponents(id, components, connection);
  });
}

async function commit(token, userId) {
  const record = await PreviewStorage.get(token);
  if (!record) throw Object.assign(new Error('Preview token not found or expired'), { statusCode: 404, code: 'PREVIEW_EXPIRED' });
  if (String(record.user_id) !== String(userId)) throw Object.assign(new Error('Preview token does not belong to current user'), { statusCode: 403 });
  const successes = [], failures = [];
  for (const row of record.rows) {
    if (row.status !== 'VALID') { failures.push(row); continue; }
    try {
      let refreshed;
      if (record.type === 'parents') refreshed = await validateParentRow(row.original);
      else if (record.type === 'bundles') refreshed = (await validateBundleRows([row.original], row.original_components || []))[0];
      else refreshed = await validateItemRow(row.original, 'regular');
      if (refreshed.status !== 'VALID') { failures.push(refreshed); continue; }
      if (record.type === 'parents') await applyParent(refreshed.normalized, userId);
      else await applyItem(refreshed.normalized, userId);
      successes.push({ source_row: row.source_row, action: refreshed.action, code: refreshed.normalized.code });
    } catch (err) {
      failures.push({ ...row, status: 'INVALID', errors: [error(err.message, err.code || 'COMMIT_ERROR')] });
    }
  }
  await PreviewStorage.remove(token);
  const resultRecord = await PreviewStorage.save({ type: record.type, user_id: userId, rows: failures, is_result: true });
  return {
    summary: { total: record.rows.length, success: successes.length, failed: failures.length },
    successes,
    error_file_token: failures.length ? resultRecord.token : null,
  };
}

async function cancel(token, userId) {
  const record = await PreviewStorage.get(token);
  if (!record) return false;
  if (String(record.user_id) !== String(userId)) throw Object.assign(new Error('Preview token does not belong to current user'), { statusCode: 403 });
  await PreviewStorage.remove(token);
  return true;
}

async function errorFile(token, userId) {
  const record = await PreviewStorage.get(token);
  if (!record || !record.is_result) throw Object.assign(new Error('Error file token not found or expired'), { statusCode: 404 });
  if (String(record.user_id) !== String(userId)) throw Object.assign(new Error('Preview token does not belong to current user'), { statusCode: 403 });
  const originalHeaders = record.type === 'parents' ? PARENT_HEADERS : record.type === 'items' ? ITEM_HEADERS : BUNDLE_HEADERS;
  const headers = [...originalHeaders, '_source_row', '_import_action', '_import_status', '_error_code', '_error_message'];
  const reverseMap = record.type === 'parents' ? PARENT_MAP : record.type === 'items' ? ITEM_MAP : BUNDLE_MAP;
  const rows = record.rows.map((row) => {
    const visible = {};
    Object.entries(reverseMap).forEach(([header, key]) => { visible[header] = row.original?.[key] ?? ''; });
    return { ...visible, _source_row: row.source_row, _import_action: row.action, _import_status: 'FAILED', _error_code: row.errors.map((e) => e.code).join('; '), _error_message: row.errors.map((e) => e.message).join('; ') };
  });
  return { filename: `${record.type}-import-errors.xlsx`, buffer: await createWorkbookBuffer([{ name: 'Failed Rows', headers, rows }]) };
}

module.exports = { preview, commit, cancel, errorFile };
