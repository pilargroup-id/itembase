const ItemDataModel = require('../../models/item-data/item-data.model');
const PreviewStorage = require('./preview-storage.service');
const { readWorkbook, worksheetToObjects, createWorkbookBuffer } = require('../../utils/xlsx.util');

const NULL_MARKER = 'NULL';
const PARENT_HEADERS = ['parent_code','brand_code','subbrand_name','item_name','category_detail','item_type_code','parent_name','status','ports','variant_attributes'];
const ITEM_HEADERS = ['item_code','item_name','selling_name','parent_code','uom_code','qty_per_pack','height','width','depth','gross_weight_pack','production_time_days','is_active','variants'];
const BUNDLE_HEADERS = ['item_code','selling_name','parent_code','uom_code','is_active'];
const COMPONENT_HEADERS = ['bundle_item_code','component_item_code','qty','sort_order'];

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
function rowResult(row, action, errors = [], normalized = null) {
  return { source_row: row._source_row, action, status: errors.length ? 'INVALID' : 'VALID', errors, normalized, original: row };
}
function currentYear2() { return String(new Date().getFullYear()).slice(-2); }

async function resolveParentReferences(row, errors) {
  const out = {};
  const specs = [
    ['brand_code','brand','brand_id',false], ['category_detail','category','category_id',false],
    ['item_type_code','item_type','item_type_id',false],
  ];
  for (const [field,type,target] of specs) {
    if (!supplied(row, field)) continue;
    if (isNull(row[field])) { out[target] = null; continue; }
    const found = await ItemDataModel.findByCode(type, text(row[field]));
    if (!found || !Number(found.is_active)) errors.push(error(`${field} ${text(row[field])} not found or inactive`, 'REFERENCE_NOT_FOUND'));
    else out[target] = found.id;
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
        if (!found || !Number(found.is_active)) errors.push(error(`Variant attribute ${code} not found or inactive`, 'REFERENCE_NOT_FOUND'));
        else out.variant_attributes.push(found);
      }
    }
  }
  return out;
}

async function validateParentRow(row) {
  const errors = [];
  const code = text(row.parent_code);
  if (!/^P\d{6}$/.test(code)) return rowResult(row, 'UNKNOWN', [error('parent_code must use format P followed by 6 digits', 'INVALID_CODE_FORMAT')]);
  const existing = await ItemDataModel.findParentByCode(code);
  const action = existing ? 'UPDATE' : 'CREATE';
  const last = await ItemDataModel.findLastParentCode();
  if (!existing && last && Number(code.slice(1)) <= Number(last.parent_code.slice(1))) errors.push(error(`New parent_code must be greater than current last code ${last.parent_code}`, 'INVALID_SEQUENCE'));
  const mandatory = ['brand_code','subbrand_name','item_name','category_detail','item_type_code','parent_name'];
  if (!existing) mandatory.forEach((field) => { if (!supplied(row, field) || isNull(row[field])) errors.push(error(`${field} is required for create`, 'REQUIRED_FIELD')); });
  const refs = await resolveParentReferences(row, errors);
  const fields = { ...refs };
  for (const field of ['item_name','parent_name','status']) {
    if (!supplied(row, field)) continue;
    if (isNull(row[field])) {
      if (['item_name','parent_name'].includes(field)) errors.push(error(`${field} cannot be cleared`, 'FIELD_NOT_NULLABLE'));
      else fields[field] = null;
    } else fields[field] = text(row[field]);
  }
  if (!existing && !supplied(row, 'status')) fields.status = 'active';
  if (fields.status !== undefined && fields.status !== null && !['draft','active','inactive','discontinued'].includes(fields.status)) errors.push(error('status must be draft, active, inactive, or discontinued'));
  if (existing && !Object.keys(fields).length) errors.push(error('No fields supplied for update', 'NO_CHANGES'));
  return rowResult(row, action, errors, { code, existing_id: existing?.id || null, fields });
}

async function resolveItemReferences(row, errors) {
  const out = {};
  if (supplied(row, 'parent_code')) {
    if (isNull(row.parent_code)) errors.push(error('parent_code cannot be cleared', 'FIELD_NOT_NULLABLE'));
    else {
      const parent = await ItemDataModel.findParentByCode(text(row.parent_code));
      if (!parent) errors.push(error(`Parent ${text(row.parent_code)} not found`, 'REFERENCE_NOT_FOUND'));
      else out.parent_id = parent.id;
    }
  }
  if (supplied(row, 'uom_code')) {
    if (isNull(row.uom_code)) errors.push(error('uom_code cannot be cleared', 'FIELD_NOT_NULLABLE'));
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
    if (attributes.has(attributeCode)) { errors.push(error(`Duplicate variant attribute ${attributeCode}`)); continue; }
    attributes.add(attributeCode);
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
  if (!/^68\d{10}$/.test(code)) errors.push(error('item_code must contain exactly 12 digits and start with 68', 'INVALID_CODE_FORMAT'));
  if (!existing && !code.startsWith(prefix)) errors.push(error(`New item_code must use current year prefix ${prefix}`, 'INVALID_ITEM_YEAR'));
  if (existing && existing.item_kind !== kind) errors.push(error(`Existing item is ${existing.item_kind}; item kind cannot be changed`, 'ITEM_KIND_IMMUTABLE'));
  const required = kind === 'regular' ? ['item_name','parent_code','uom_code'] : ['parent_code','uom_code'];
  if (!existing) required.forEach((field) => { if (!supplied(row, field) || isNull(row[field])) errors.push(error(`${field} is required for create`, 'REQUIRED_FIELD')); });
  const fields = await resolveItemReferences(row, errors);
  if (kind === 'regular') {
    if (supplied(row, 'item_name')) {
      if (isNull(row.item_name)) errors.push(error('item_name cannot be cleared', 'FIELD_NOT_NULLABLE'));
      else fields.item_name = text(row.item_name);
    }
    if (supplied(row, 'selling_name')) fields.selling_name = isNull(row.selling_name) ? null : text(row.selling_name);
    if (!existing && !fields.selling_name) fields.selling_name = fields.item_name;
    if (supplied(row, 'variants')) fields.variants = await resolveVariants(row.variants, errors);
    for (const field of ['qty_per_pack','height','width','depth','gross_weight_pack']) {
      if (!supplied(row, field)) continue;
      fields[field] = isNull(row[field]) ? null : toNumber(row[field]);
      if (!isNull(row[field]) && fields[field] === null) errors.push(error(`${field} must be a non-negative number`));
    }
    if (supplied(row, 'production_time_days')) {
      fields.production_time_days = isNull(row.production_time_days) ? null : toNumber(row.production_time_days, true);
      if (!isNull(row.production_time_days) && fields.production_time_days === null) errors.push(error('production_time_days must be a non-negative integer'));
    }
  } else if (supplied(row, 'selling_name')) fields.selling_name = isNull(row.selling_name) ? null : text(row.selling_name);
  if (supplied(row, 'is_active')) {
    if (isNull(row.is_active)) errors.push(error('is_active cannot be cleared'));
    else {
      fields.is_active = toBool(row.is_active);
      if (fields.is_active === null) errors.push(error('is_active must be 0/1, active/inactive, true/false'));
    }
  }
  if (!existing && fields.is_active === undefined) fields.is_active = 1;
  if (existing && !Object.keys(fields).length) errors.push(error('No fields supplied for update', 'NO_CHANGES'));
  return rowResult(row, action, errors, { code, existing_id: existing?.id || null, fields, kind });
}

async function validateBundleRows(bundleRows, componentRows) {
  const componentsByCode = new Map();
  componentRows.forEach((row) => {
    const code = text(row.bundle_item_code);
    if (!componentsByCode.has(code)) componentsByCode.set(code, []);
    componentsByCode.get(code).push(row);
  });
  const results = [];
  for (const row of bundleRows) {
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
      if (sortOrder === null || sortOrder < 1) result.errors.push(error(`Component ${componentCode} sort_order must be a positive integer`));
      const validQty = qty !== null && qty > 0 && (componentSource.length > 1 || qty > 1);
      if (item && item.item_kind === 'regular' && validQty && sortOrder >= 1) resolved.push({ item_id: item.id, item_code: item.item_code, item_name: item.item_name, qty, sort_order: sortOrder });
    }
    result.original_components = componentSource;
    if (componentSource.length && result.errors.some((entry) => entry.code === 'NO_CHANGES')) {
      result.errors = result.errors.filter((entry) => entry.code !== 'NO_CHANGES');
    }
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
  if (type === 'parents') return worksheetToObjects(workbook.getWorksheet('Parents'));
  if (type === 'items') return worksheetToObjects(workbook.getWorksheet('Items'));
  if (type === 'bundles') return {
    bundles: worksheetToObjects(workbook.getWorksheet('Bundles')),
    components: worksheetToObjects(workbook.getWorksheet('Bundle Components')),
  };
  throw Object.assign(new Error('Import type must be parents, items, or bundles'), { statusCode: 422 });
}

async function preview(type, buffer, userId) {
  await PreviewStorage.cleanupExpired();
  const parsed = await parse(type, buffer);
  let results = [];
  if (type === 'parents') for (const row of parsed) results.push(await validateParentRow(row));
  if (type === 'items') for (const row of parsed) results.push(await validateItemRow(row, 'regular'));
  if (type === 'bundles') results = await validateBundleRows(parsed.bundles, parsed.components);
  const duplicateCodes = new Set();
  const seen = new Set();
  results.forEach((row) => { const code = row.normalized?.code || text(row.original.parent_code || row.original.item_code); if (seen.has(code)) duplicateCodes.add(code); seen.add(code); });
  results.forEach((row) => { if (duplicateCodes.has(row.normalized?.code)) { row.errors.push(error('Duplicate pivot code in uploaded file', 'DUPLICATE_FILE_CODE')); row.status='INVALID'; } });
  const record = await PreviewStorage.save({ type, user_id: userId, rows: results });
  return {
    preview_token: record.token, expires_at: record.expires_at,
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
  record.commit_result = { successes, failures, committed_at: new Date().toISOString() };
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
  if (String(record.user_id) !== String(userId)) throw Object.assign(new Error('Error file token does not belong to current user'), { statusCode: 403 });
  const originalHeaders = record.type === 'parents' ? PARENT_HEADERS : record.type === 'items' ? ITEM_HEADERS : BUNDLE_HEADERS;
  const headers = [...originalHeaders, '_source_row', '_import_action', '_import_status', '_error_code', '_error_message'];
  const rows = record.rows.map((row) => ({ ...row.original, _source_row: row.source_row, _import_action: row.action, _import_status: 'FAILED', _error_code: row.errors.map((e) => e.code).join('; '), _error_message: row.errors.map((e) => e.message).join('; ') }));
  return { filename: `${record.type}-import-errors.xlsx`, buffer: await createWorkbookBuffer([{ name: 'Failed Rows', headers, rows }]) };
}

module.exports = { preview, commit, cancel, errorFile };
