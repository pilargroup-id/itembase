const crypto = require('crypto');
const ItemModel = require('../../models/item/item.model');
const ActivityLogService = require('../activity-log.service');
const DirectoryService = require('../pilargroup-directory.service');

const ALLOWED_ITEM_KIND = ['regular', 'bundle'];
const STRING_LIMITS = { item_name: 255, selling_name: 255, parent_id: 36, uom_id: 36, component_item_id: 36 };
const DECIMAL_FIELDS = ['qty_per_pack', 'height', 'width', 'depth', 'gross_weight_pack'];
const INTEGER_FIELDS = ['production_time_days'];

function makeError(message, statusCode = 400, code = 'ERROR', errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.errors = errors;
  return error;
}

function hasValue(value) { return value !== undefined && value !== null && value !== ''; }
function validateRequired(value) { return hasValue(value) && String(value).trim() !== ''; }
function normalizeBoolean(value, defaultValue = 1) { return hasValue(value) ? (Number(value) ? 1 : 0) : defaultValue; }
function normalizeNumber(value, defaultValue = null) { return hasValue(value) ? Number(value) : defaultValue; }
function isValidBoolean(value) { return [0, 1, '0', '1', true, false].includes(value); }
function normalizeQty(value) { const n = Number(value); return Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, ''); }

function isValidDecimal(value) {
  if (!hasValue(value)) return true;
  const text = String(value).trim();
  return /^\d+(\.\d{1,2})?$/.test(text) && Number.isFinite(Number(text)) && Number(text) >= 0 && Number(text) <= 9999999999.99;
}

function isValidPositiveDecimal(value) { return hasValue(value) && isValidDecimal(value) && Number(value) > 0; }
function isValidInteger(value) { return !hasValue(value) || (/^\d+$/.test(String(value).trim()) && Number.isSafeInteger(Number(value)) && Number(value) >= 0); }

function validateGeneratedFields(payload = {}) {
  const errors = {};
  if (payload.item_code !== undefined) errors.item_code = 'Item code is auto generated and cannot be sent from request';
  if (payload.barcode !== undefined) errors.barcode = 'Barcode is auto generated and cannot be sent from request';
  return errors;
}

function validateImmutableItemKind(existing, payload = {}) {
  if (hasValue(payload.item_kind) && ALLOWED_ITEM_KIND.includes(payload.item_kind) && payload.item_kind !== existing.item_kind) {
    throw makeError('Item kind cannot be changed after item is created', 422, 'ITEM_KIND_IMMUTABLE', { item_kind: `Current item kind is ${existing.item_kind}` });
  }
}

function validatePayload(payload = {}, options = {}) {
  const { requireParent = true, requireItemName = true } = options;
  const errors = { ...validateGeneratedFields(payload) };
  if (!validateRequired(payload.item_kind)) errors.item_kind = 'Item kind is required';
  else if (!ALLOWED_ITEM_KIND.includes(payload.item_kind)) errors.item_kind = 'Item kind must be regular or bundle';
  if (requireParent && !validateRequired(payload.parent_id)) errors.parent_id = 'Parent item is required';
  if (requireItemName && payload.item_kind === 'regular' && !validateRequired(payload.item_name)) errors.item_name = 'Item name is required for regular item';
  if (hasValue(payload.is_active) && !isValidBoolean(payload.is_active)) errors.is_active = 'Is active must be 0 or 1';

  [['item_name', 255], ['selling_name', 255], ['parent_id', 36], ['uom_id', 36]].forEach(([field, max]) => {
    if (hasValue(payload[field]) && String(payload[field]).length > max) errors[field] = `${field} cannot be longer than ${max} characters`;
  });
  DECIMAL_FIELDS.forEach((field) => { if (!isValidDecimal(payload[field])) errors[field] = `${field} must be a positive decimal with maximum 2 decimal places`; });
  INTEGER_FIELDS.forEach((field) => { if (!isValidInteger(payload[field])) errors[field] = `${field} must be a positive integer`; });
  return errors;
}

function validateComponents(components = [], itemKind, isProvided = false) {
  if (components === undefined || components === null) return [];
  if (!Array.isArray(components)) throw makeError('Components must be an array', 422, 'VALIDATION_ERROR');
  if (itemKind !== 'bundle') {
    if (isProvided && components.length) throw makeError('Components are only allowed for bundle items', 422, 'VALIDATION_ERROR');
    return [];
  }
  if (components.length < 1) throw makeError('Bundle must have at least 1 component', 422, 'VALIDATION_ERROR');
  if (components.length > 5) throw makeError('Bundle can only have maximum 5 components', 422, 'VALIDATION_ERROR');
  const unique = new Set();
  return components.map((component, index) => {
    if (!component || typeof component !== 'object') throw makeError(`Component at index ${index} is invalid`, 422, 'VALIDATION_ERROR');
    if (!validateRequired(component.component_item_id) || String(component.component_item_id).length > STRING_LIMITS.component_item_id) throw makeError(`Component item is invalid at index ${index}`, 422, 'VALIDATION_ERROR');
    if (unique.has(component.component_item_id)) throw makeError('Duplicate component item in request', 422, 'VALIDATION_ERROR');
    unique.add(component.component_item_id);
    if (!isValidPositiveDecimal(component.qty)) throw makeError(`Component qty must be greater than 0 at index ${index}`, 422, 'VALIDATION_ERROR');
    if (components.length === 1 && Number(component.qty) <= 1) throw makeError('A bundle with 1 component must have component qty greater than 1', 422, 'VALIDATION_ERROR');
    if (hasValue(component.sort_order) && (!isValidInteger(component.sort_order) || Number(component.sort_order) <= 0)) throw makeError(`Component sort order is invalid at index ${index}`, 422, 'VALIDATION_ERROR');
    return { component_item_id: component.component_item_id, qty: Number(component.qty), sort_order: hasValue(component.sort_order) ? Number(component.sort_order) : index + 1 };
  });
}


function normalizeVariantInputs(source) {
  if (source === undefined || source === null) return null;
  if (!Array.isArray(source)) throw makeError('Variants must be an array', 422, 'VALIDATION_ERROR');

  const attributes = new Set();
  return source.map((entry, index) => {
    const attribute_id = String(entry?.attribute_id || entry?.attribute?.id || '').trim();
    const value_id = String(entry?.value_id || entry?.variant_value_id || entry?.value?.id || '').trim();
    const rawValueName = typeof entry?.value === 'string' ? entry.value : (entry?.value_name || entry?.value?.name || '');
    const value_name = String(rawValueName || '').trim();

    if (!attribute_id || (!value_id && !value_name)) {
      throw makeError(`Variant is invalid at index ${index}`, 422, 'VALIDATION_ERROR');
    }
    if (attributes.has(attribute_id)) {
      throw makeError('Each variant attribute can only be used once', 422, 'VALIDATION_ERROR');
    }
    attributes.add(attribute_id);
    return { attribute_id, value_id: value_id || null, value_name: value_name || null };
  });
}

function variantCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function resolveVariantInputs(inputs, connection, userId = null, req = null) {
  const resolved = [];
  for (const input of (inputs || [])) {
    if (input.value_id) {
      resolved.push({ attribute_id: input.attribute_id, value_id: input.value_id });
      continue;
    }

    const valueName = String(input.value_name || '').trim().toUpperCase();
    if (!valueName) throw makeError('Variant value name is required', 422, 'VALIDATION_ERROR');

    let existing = await ItemModel.findVariantValueByNameOrCode(input.attribute_id, valueName, connection);
    if (existing) {
      if (!Number(existing.is_active)) {
        throw makeError(`Variant value ${valueName} exists but is inactive`, 422, 'VALIDATION_ERROR');
      }
      resolved.push({ attribute_id: input.attribute_id, value_id: existing.id });
      continue;
    }

    const code = variantCode(valueName);
    if (!code) throw makeError('Variant value cannot generate a valid code', 422, 'VALIDATION_ERROR');
    const codeConflict = await ItemModel.findVariantValueByCode(input.attribute_id, code, connection);
    if (codeConflict) {
      throw makeError(`Variant value code ${code} already exists for this attribute`, 409, 'VARIANT_VALUE_CODE_CONFLICT');
    }

    const created = await ItemModel.createVariantValue({
      attribute_id: input.attribute_id,
      code,
      name: valueName,
      sort_order: await ItemModel.nextVariantValueSortOrder(input.attribute_id, connection),
    }, connection);

    await ActivityLogService.log({
      user_id: userId,
      action: 'CREATE',
      entity_type: 'master_variant_values',
      entity_id: created.id,
      description: `Created variant value ${created.name}`,
      before_data: null,
      after_data: created,
      metadata: { source: 'ITEM_SUGGESTION_FIELD', attribute_id: input.attribute_id, code: created.code },
      req,
      connection,
    });

    resolved.push({ attribute_id: input.attribute_id, value_id: created.id });
  }
  return resolved;
}

async function validateVariants(parentId, variants, connection, excludeItemId=null, options = {}) {
  const { requireAllParentAttributes = false } = options;
  const parentAttrs=await ItemModel.findParentVariantAttributes(parentId,connection);
  const normalized=variants||[];
  if(requireAllParentAttributes&&parentAttrs.some(a=>!Number(a.is_active)))throw makeError('One or more parent variant attributes are inactive',422,'VALIDATION_ERROR');
  if(requireAllParentAttributes&&parentAttrs.length!==normalized.length)throw makeError('Variants must match all variant attributes configured on the parent',422,'VALIDATION_ERROR',{variants:`Expected ${parentAttrs.length} variant values`});
  if(!normalized.length)return[];
  const values=await ItemModel.findVariantValuesByIds(normalized.map(v=>v.value_id),connection);const valueMap=new Map(values.map(v=>[v.id,v]));const allowed=new Set(parentAttrs.map(a=>a.attribute_id));
  for(const v of normalized){const row=valueMap.get(v.value_id);if(requireAllParentAttributes&&!allowed.has(v.attribute_id))throw makeError('Variant attribute is not configured on this parent',422,'VALIDATION_ERROR');if(!row||row.attribute_id!==v.attribute_id||!Number(row.is_active))throw makeError('Variant value does not belong to the selected active attribute',422,'VALIDATION_ERROR');}
  const duplicate=await ItemModel.findDuplicateVariantCombination(parentId,normalized,excludeItemId,connection);if(duplicate)throw makeError(`Variant combination already exists on item ${duplicate.item_code}`,409,'DUPLICATE_VARIANT_COMBINATION');
  return normalized;
}
function cartesian(groups){return groups.reduce((acc,group)=>acc.flatMap(prefix=>group.map(value=>[...prefix,value])),[[]]);}

async function validateReferences(payload, connection) {
  if (payload.parent_id && !(await ItemModel.findParentById(payload.parent_id, connection))) throw makeError('Parent item not found', 404, 'PARENT_NOT_FOUND');
  if (payload.uom_id && !(await ItemModel.findUomById(payload.uom_id, connection))) throw makeError('UOM not found', 404, 'UOM_NOT_FOUND');
}

async function validateBundleComponents(components, connection) {
  if (!components.length) return [];
  const ids = components.map((component) => component.component_item_id);
  const rows = await ItemModel.findItemsByIds(ids, connection);
  const map = new Map(rows.map((item) => [item.id, item]));
  if (ids.some((id) => !map.has(id))) throw makeError('One or more component items not found', 404, 'COMPONENT_ITEM_NOT_FOUND');
  if (rows.some((item) => item.item_kind === 'bundle')) throw makeError('Bundle item cannot be used as component', 422, 'INVALID_BUNDLE_COMPONENT');
  return components.map((component) => ({ ...component, item: map.get(component.component_item_id) }));
}

function generateNextBarcode(lastBarcode) {
  const prefix = `68${String(new Date().getFullYear()).slice(-2)}`;
  const next = lastBarcode ? (parseInt(String(lastBarcode).slice(4), 10) || 0) + 1 : 1;
  return `${prefix}${String(next).padStart(8, '0')}`;
}

function buildBundleItemName(components) {
  return `BUNDLE ${components.sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map((component) => `${normalizeQty(component.qty)} ${component.item.item_name}`).join(' + ')}`;
}

function normalizeItemData(payload, userId, generatedCode = null, existing = null) {
  return {
    id: existing?.id || crypto.randomUUID(), item_code: existing?.item_code || generatedCode,
    barcode: existing?.barcode || generatedCode, item_name: String(payload.item_name || '').trim(),
    selling_name: String(payload.selling_name || payload.item_name || '').trim(), item_kind: payload.item_kind,
    parent_id: payload.parent_id, uom_id: payload.uom_id || null,
    qty_per_pack: normalizeNumber(payload.qty_per_pack), height: normalizeNumber(payload.height),
    width: normalizeNumber(payload.width), depth: normalizeNumber(payload.depth),
    gross_weight_pack: normalizeNumber(payload.gross_weight_pack),
    production_time_days: normalizeNumber(payload.production_time_days),
    is_active: normalizeBoolean(payload.is_active, existing?.is_active ?? 1),
    created_by: existing?.created_by || userId, updated_by: userId,
  };
}

async function enrichItems(items = []) {
  if (!items.length) return items;
  const businessUnitIds = [], departmentIds = [], userIds = [];
  items.forEach((item) => {
    if (item.created_by && typeof item.created_by !== 'object') userIds.push(item.created_by);
    if (item.updated_by && typeof item.updated_by !== 'object') userIds.push(item.updated_by);
    (item.parent?.brand?.channels || []).forEach((channel) => {
      businessUnitIds.push(channel.business_unit_id);
      departmentIds.push(channel.department_id);
    });
    (item.parent?.category?.users || []).forEach((relation) => userIds.push(relation.central_user_id));
  });
  const [allBusinessUnits, allDepartments, allUsers] = await Promise.all([DirectoryService.getBusinessUnits(), DirectoryService.getDepartments(), DirectoryService.getUsers()]);
  const buMap = new Map(DirectoryService.findBusinessUnitsByIds(allBusinessUnits, businessUnitIds).map((row) => [String(row.id), row]));
  const departmentMap = new Map(DirectoryService.findDepartmentsByIds(allDepartments, departmentIds).map((row) => [Number(row.id), row]));
  const userMap = new Map(DirectoryService.findUsersByIds(allUsers, userIds).map((row) => [String(row.id), row]));
  items.forEach((item) => {
    ['created_by', 'updated_by'].forEach((field) => {
      if (item[field] && typeof item[field] !== 'object') {
        const user = userMap.get(String(item[field]));
        if (user) item[field] = { id: user.id, name: user.name, username: user.username };
      }
    });
    if (item.parent?.brand) {
      item.parent.brand.channels = item.parent.brand.channels.map((channel) => {
        const bu = buMap.get(String(channel.business_unit_id));
        const department = departmentMap.get(Number(channel.department_id));
        return { ...channel, business_unit_code: bu?.code || null, business_unit_name: bu?.name || null, department_code: department?.code || null, department_name: department?.name || null };
      });
    }
    if (item.parent?.category) {
      item.parent.category.users = item.parent.category.users.map((relation) => {
        const user = userMap.get(String(relation.central_user_id));
        return { ...relation, user: user ? { id: user.id, name: user.name, username: user.username, email: user.email } : null };
      });
    }
  });
  return items;
}

async function index(query) { const result = await ItemModel.findAll(query); await enrichItems(result.data); return result; }
async function show(id) { const item = await ItemModel.findById(id); if (!item) throw makeError('Item not found', 404, 'ITEM_NOT_FOUND'); await enrichItems([item]); return item; }

async function store(payload, userId, req = null) {
  const errors = validatePayload(payload);
  if (Object.keys(errors).length) throw makeError('Validation failed', 422, 'VALIDATION_ERROR', errors);
  const components = validateComponents(payload.components || [], payload.item_kind, payload.components !== undefined);
  return ItemModel.transaction(async (connection) => {
    await validateReferences(payload, connection);
    const generatedCode = generateNextBarcode(await ItemModel.findLastBarcodeByYear(String(new Date().getFullYear()).slice(-2), connection));
    let finalPayload = { ...payload };
    if (payload.item_kind === 'bundle') {
      const withItems = await validateBundleComponents(components, connection);
      const generatedName = buildBundleItemName(withItems);
      if (generatedName.length > STRING_LIMITS.item_name) throw makeError('Generated bundle item name cannot be longer than 255 characters', 422, 'VALIDATION_ERROR');
      finalPayload.item_name = generatedName;
    }
    const variantInputs=normalizeVariantInputs(payload.variants)||[];
    const variants=await resolveVariantInputs(variantInputs,connection,userId,req);
    if(payload.item_kind==='bundle'&&variants.length)throw makeError('Variants are only allowed for regular items',422,'VALIDATION_ERROR');
    if(payload.item_kind==='regular')await validateVariants(payload.parent_id,variants,connection);
    const itemData = normalizeItemData(finalPayload, userId, generatedCode);
    await ItemModel.create(itemData, connection);
    if (payload.item_kind === 'bundle') await ItemModel.replaceComponents(itemData.id, components, connection);
    await ItemModel.replaceVariants(itemData.id,variants,connection);
    const finalItem = await ItemModel.findById(itemData.id, connection);
    await enrichItems([finalItem]);
    await ActivityLogService.log({ user_id: userId, action: 'CREATE', entity_type: 'items', entity_id: finalItem.id, description: `Created ${finalItem.item_kind} item ${finalItem.item_code}`, before_data: null, after_data: finalItem, metadata: { item_code: finalItem.item_code, item_kind: finalItem.item_kind, component_count: finalItem.components.length }, req, connection });
    return finalItem;
  });
}

async function update(id, payload, userId, req = null) {
  const existing = await ItemModel.findRawById(id);
  if (!existing) throw makeError('Item not found', 404, 'ITEM_NOT_FOUND');
  validateImmutableItemKind(existing, payload);
  const generatedErrors = validateGeneratedFields(payload);
  if (Object.keys(generatedErrors).length) throw makeError('Validation failed', 422, 'VALIDATION_ERROR', generatedErrors);
  const merged = {
    item_kind: payload.item_kind ?? existing.item_kind, parent_id: payload.parent_id ?? existing.parent_id,
    uom_id: payload.uom_id ?? existing.uom_id, item_name: payload.item_name ?? existing.item_name,
    selling_name: payload.selling_name ?? existing.selling_name,
    qty_per_pack: payload.qty_per_pack ?? existing.qty_per_pack, height: payload.height ?? existing.height,
    width: payload.width ?? existing.width, depth: payload.depth ?? existing.depth,
    gross_weight_pack: payload.gross_weight_pack ?? existing.gross_weight_pack,
    production_time_days: payload.production_time_days ?? existing.production_time_days,
    is_active: payload.is_active ?? existing.is_active,
  };
  const errors = validatePayload(merged, {
    requireParent: payload.parent_id !== undefined || hasValue(existing.parent_id),
    requireItemName: payload.item_name !== undefined || hasValue(existing.item_name),
  });
  if (Object.keys(errors).length) throw makeError('Validation failed', 422, 'VALIDATION_ERROR', errors);
  const shouldReplaceComponents = payload.components !== undefined;
  const shouldReplaceVariants = payload.variants !== undefined;
  const components = shouldReplaceComponents ? validateComponents(payload.components || [], merged.item_kind, true) : null;
  return ItemModel.transaction(async (connection) => {
    await validateReferences(merged, connection);
    let finalPayload = { ...merged };
    if (merged.item_kind === 'bundle' && components) {
      const withItems = await validateBundleComponents(components, connection);
      finalPayload.item_name = buildBundleItemName(withItems);
    }
    const shouldRevalidateVariants = shouldReplaceVariants || payload.parent_id !== undefined;
    const variants=shouldReplaceVariants?await resolveVariantInputs(normalizeVariantInputs(payload.variants)||[],connection,userId,req):(await ItemModel.findVariantsByItemIds([id],connection))[id]?.map(v=>({attribute_id:v.attribute.id,value_id:v.value.id}))||[];
    if(merged.item_kind==='bundle'&&variants.length)throw makeError('Variants are only allowed for regular items',422,'VALIDATION_ERROR');
    if(merged.item_kind==='regular'&&shouldRevalidateVariants)await validateVariants(merged.parent_id,variants,connection,id);
    const itemData = normalizeItemData(finalPayload, userId, null, existing);
    await ItemModel.update(id, itemData, connection);
    if (merged.item_kind === 'bundle' && shouldReplaceComponents) await ItemModel.replaceComponents(id, components, connection);
    if (merged.item_kind === 'regular') await ItemModel.deleteComponents(id, connection);
    if(shouldReplaceVariants||payload.parent_id!==undefined)await ItemModel.replaceVariants(id,variants,connection);
    const finalItem = await ItemModel.findById(id, connection);
    await enrichItems([finalItem]);
    await ActivityLogService.log({ user_id: userId, action: Number(existing.is_active) !== Number(finalItem.is_active) ? 'STATUS_CHANGE' : 'UPDATE', entity_type: 'items', entity_id: id, description: `Updated item ${finalItem.item_code}`, before_data: existing, after_data: finalItem, metadata: { item_code: finalItem.item_code, component_count: finalItem.components.length }, req, connection });
    return finalItem;
  });
}


async function previewMatrix(payload={}){
  const parentId=String(payload.item_parent_id||payload.parent_id||'').trim();if(!parentId)throw makeError('Item parent is required',422,'VALIDATION_ERROR');
  const parent=await ItemModel.findParentById(parentId);if(!parent)throw makeError('Parent item not found',404,'PARENT_NOT_FOUND');
  const groups=payload.attributes;if(!Array.isArray(groups)||!groups.length)throw makeError('Attributes must be a non-empty array',422,'VALIDATION_ERROR');
  const seenAttrs=new Set();const normalized=[];for(const group of groups){const attribute_id=String(group.attribute_id||'');if(!attribute_id)throw makeError('Variant attribute is required',422,'VALIDATION_ERROR');if(seenAttrs.has(attribute_id))throw makeError('Duplicate variant attribute in matrix request',422,'VALIDATION_ERROR');seenAttrs.add(attribute_id);const valueIds=[...new Set((group.value_ids||[]).map(String))];if(!valueIds.length)throw makeError('Each attribute must have at least one value',422,'VALIDATION_ERROR');const rows=await ItemModel.findVariantValuesByIds(valueIds);if(rows.length!==valueIds.length||rows.some(v=>v.attribute_id!==attribute_id||!Number(v.is_active)))throw makeError('One or more variant values are invalid',422,'VALIDATION_ERROR');normalized.push(rows.map(v=>({attribute_id,value_id:v.id,attribute_code:v.attribute_code,attribute_name:v.attribute_name,value_code:v.code,value_name:v.name})));}
  const combinations=cartesian(normalized).map((variants,index)=>({row_no:index+1,variant_summary:variants.map(v=>v.value_name).join(' / '),suggested_item_name:`${parent.parent_name} ${variants.map(v=>v.value_name).join(' ')}`.trim().toUpperCase(),suggested_selling_name:`${parent.parent_name} ${variants.map(v=>v.value_name).join(' ')}`.trim(),variants:variants.map(v=>({attribute_id:v.attribute_id,value_id:v.value_id,attribute_code:v.attribute_code,attribute_name:v.attribute_name,value_code:v.value_code,value_name:v.value_name}))}));
  return{item_parent_id:parentId,total_combinations:combinations.length,combinations};
}
async function createMatrix(payload,userId,req=null){
  const parentId=String(payload.item_parent_id||payload.parent_id||'').trim();if(!parentId)throw makeError('Item parent is required',422,'VALIDATION_ERROR');if(!Array.isArray(payload.items)||!payload.items.length)throw makeError('Items must be a non-empty array',422,'VALIDATION_ERROR');if(payload.items.length>250)throw makeError('Maximum 250 items per matrix request',422,'VALIDATION_ERROR');
  return ItemModel.transaction(async connection=>{const parent=await ItemModel.findParentById(parentId,connection);if(!parent)throw makeError('Parent item not found',404,'PARENT_NOT_FOUND');let last=await ItemModel.findLastBarcodeByYear(String(new Date().getFullYear()).slice(-2),connection);const created=[];
    for(const [index,row] of payload.items.entries()){const merged={...(payload.common_values||{}),...row,parent_id:parentId,item_kind:'regular'};const errors=validatePayload(merged);if(Object.keys(errors).length)throw makeError(`Validation failed at matrix row ${index+1}`,422,'VALIDATION_ERROR',errors);const variants=await resolveVariantInputs(normalizeVariantInputs(row.variants)||[],connection,userId,req);await validateReferences(merged,connection);await validateVariants(parentId,variants,connection);const next=generateNextBarcode(last);last=next;const data=normalizeItemData(merged,userId,next);await ItemModel.create(data,connection);await ItemModel.replaceVariants(data.id,variants,connection);created.push(await ItemModel.findById(data.id,connection));}
    await enrichItems(created);await ActivityLogService.log({user_id:userId,action:'CREATE',entity_type:'items',entity_id:null,description:`Created ${created.length} items from variant matrix`,after_data:created,metadata:{item_parent_id:parentId,total_items:created.length},req,connection});return{total_created:created.length,items:created};});
}

module.exports = { index, show, store, update, previewMatrix, createMatrix };