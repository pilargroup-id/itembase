const crypto = require('crypto');
const ItemModel = require('../../models/item/item.model');

const ALLOWED_ITEM_KIND = ['regular', 'bundle'];

const STRING_LIMITS = {
  item_code: 50,
  barcode: 100,
  item_name: 255,
  item_kind: 20,
  parent_id: 36,
  uom_id: 36,
  sku_status_id: 36,
  business_unit_id: 36,
  variant: 150,
  channel_business_unit_id: 36,
  channel_name: 100,
  channel_code: 50,
  component_item_id: 36,
};

const DECIMAL_FIELDS = [
  'qty_per_pack',
  'height',
  'width',
  'depth',
  'gross_weight_pack',
];

const INTEGER_FIELDS = [
  'container_20ft_qty',
  'container_40hq_qty',
  'production_time_days',
];

function makeError(message, statusCode = 400, code = 'ERROR', errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.errors = errors;
  return error;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function validateRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function normalizeBoolean(value, defaultValue = 1) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return Number(value) ? 1 : 0;
}

function normalizeNumber(value, defaultValue = null) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return Number(value);
}

function normalizeQty(value) {
  const numberValue = Number(value);

  if (Number.isInteger(numberValue)) {
    return String(numberValue);
  }

  return String(numberValue).replace(/\.?0+$/, '');
}

function isValidBoolean(value) {
  return [0, 1, '0', '1', true, false].includes(value);
}

function isValidDecimal(value) {
  if (!hasValue(value)) {
    return true;
  }

  const stringValue = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(stringValue)) {
    return false;
  }

  const numberValue = Number(stringValue);

  if (!Number.isFinite(numberValue)) {
    return false;
  }

  return numberValue >= 0 && numberValue <= 9999999999.99;
}

function isValidPositiveDecimal(value) {
  if (!hasValue(value)) {
    return false;
  }

  const stringValue = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(stringValue)) {
    return false;
  }

  const numberValue = Number(stringValue);

  if (!Number.isFinite(numberValue)) {
    return false;
  }

  return numberValue > 0 && numberValue <= 9999999999.99;
}

function isValidInteger(value) {
  if (!hasValue(value)) {
    return true;
  }

  const stringValue = String(value).trim();

  if (!/^\d+$/.test(stringValue)) {
    return false;
  }

  const numberValue = Number(stringValue);

  if (!Number.isSafeInteger(numberValue)) {
    return false;
  }

  return numberValue >= 0;
}

function validateMaxLength(errors, payload, field, maxLength, label) {
  if (!hasValue(payload[field])) {
    return;
  }

  if (String(payload[field]).length > maxLength) {
    errors[field] = `${label} cannot be longer than ${maxLength} characters`;
  }
}

function validateNullableIdLength(errors, payload, field, maxLength, label) {
  if (!hasValue(payload[field])) {
    return;
  }

  if (String(payload[field]).length > maxLength) {
    errors[field] = `${label} cannot be longer than ${maxLength} characters`;
  }
}

function validateDecimalFields(errors, payload) {
  DECIMAL_FIELDS.forEach((field) => {
    if (!isValidDecimal(payload[field])) {
      errors[field] = `${field} must be a positive decimal with maximum 2 decimal places`;
    }
  });
}

function validateIntegerFields(errors, payload) {
  INTEGER_FIELDS.forEach((field) => {
    if (!isValidInteger(payload[field])) {
      errors[field] = `${field} must be a positive integer`;
    }
  });
}

function validateGeneratedFields(payload = {}, mode = 'create') {
  const errors = {};

  if (payload.item_code !== undefined) {
    errors.item_code = 'Item code is auto generated and cannot be sent from request';
  }

  if (payload.barcode !== undefined) {
    errors.barcode = 'Barcode is auto generated and cannot be sent from request';
  }

  if (mode === 'create') {
    return errors;
  }

  return errors;
}

function validateImmutableItemKind(existing, payload = {}) {
  if (
    payload.item_kind !== undefined &&
    payload.item_kind !== null &&
    payload.item_kind !== '' &&
    ALLOWED_ITEM_KIND.includes(payload.item_kind) &&
    payload.item_kind !== existing.item_kind
  ) {
    throw makeError(
      'Item kind cannot be changed after item is created',
      422,
      'ITEM_KIND_IMMUTABLE',
      {
        item_kind: `Current item kind is ${existing.item_kind}`,
      }
    );
  }
}

function validateGeneratedBundleName(itemName) {
  if (String(itemName).length > STRING_LIMITS.item_name) {
    throw makeError(
      'Generated bundle item name cannot be longer than 255 characters',
      422,
      'VALIDATION_ERROR',
      {
        item_name: 'Generated bundle item name cannot be longer than 255 characters',
      }
    );
  }
}

function validateBasePayload(payload = {}, mode = 'create') {
  const errors = {};

  Object.assign(errors, validateGeneratedFields(payload, mode));

  if (!validateRequired(payload.item_kind)) {
    errors.item_kind = 'Item kind is required';
  } else if (!ALLOWED_ITEM_KIND.includes(payload.item_kind)) {
    errors.item_kind = 'Item kind must be regular or bundle';
  }

  if (!validateRequired(payload.parent_id)) {
    errors.parent_id = 'Parent item is required';
  }

  if (!validateRequired(payload.business_unit_id)) {
    errors.business_unit_id = 'Business unit is required';
  }

  if (payload.item_kind === 'regular' && !validateRequired(payload.item_name)) {
    errors.item_name = 'Item name is required for regular item';
  }

  if (
    payload.is_active !== undefined &&
    payload.is_active !== null &&
    payload.is_active !== '' &&
    !isValidBoolean(payload.is_active)
  ) {
    errors.is_active = 'Is active must be 0 or 1';
  }

  validateMaxLength(errors, payload, 'item_name', STRING_LIMITS.item_name, 'Item name');
  validateMaxLength(errors, payload, 'variant', STRING_LIMITS.variant, 'Variant');

  validateNullableIdLength(errors, payload, 'parent_id', STRING_LIMITS.parent_id, 'Parent item');
  validateNullableIdLength(errors, payload, 'uom_id', STRING_LIMITS.uom_id, 'UOM');
  validateNullableIdLength(errors, payload, 'sku_status_id', STRING_LIMITS.sku_status_id, 'SKU status');
  validateNullableIdLength(errors, payload, 'business_unit_id', STRING_LIMITS.business_unit_id, 'Business unit');

  validateDecimalFields(errors, payload);
  validateIntegerFields(errors, payload);

  return errors;
}

function validateChannels(channels = []) {
  if (channels === undefined || channels === null) {
    return [];
  }

  if (!Array.isArray(channels)) {
    throw makeError('Channels must be an array', 422, 'VALIDATION_ERROR');
  }

  const uniqueKeys = new Set();

  return channels.map((channel, index) => {
    if (!channel || typeof channel !== 'object') {
      throw makeError(`Channel at index ${index} is invalid`, 422, 'VALIDATION_ERROR');
    }

    if (!validateRequired(channel.business_unit_id)) {
      throw makeError(`Business unit is required at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (String(channel.business_unit_id).length > STRING_LIMITS.channel_business_unit_id) {
      throw makeError(`Business unit is invalid at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (!validateRequired(channel.department_id)) {
      throw makeError(`Department is required at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (!isValidInteger(channel.department_id) || Number(channel.department_id) <= 0) {
      throw makeError(`Department must be a valid integer at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (hasValue(channel.channel_name) && String(channel.channel_name).length > STRING_LIMITS.channel_name) {
      throw makeError(`Channel name cannot be longer than 100 characters at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (hasValue(channel.channel_code) && String(channel.channel_code).length > STRING_LIMITS.channel_code) {
      throw makeError(`Channel code cannot be longer than 50 characters at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (hasValue(channel.is_primary) && !isValidBoolean(channel.is_primary)) {
      throw makeError(`Is primary must be 0 or 1 at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (hasValue(channel.is_active) && !isValidBoolean(channel.is_active)) {
      throw makeError(`Is active must be 0 or 1 at channel index ${index}`, 422, 'VALIDATION_ERROR');
    }

    const key = `${channel.business_unit_id}-${Number(channel.department_id)}`;

    if (uniqueKeys.has(key)) {
      throw makeError('Duplicate channel in request', 422, 'VALIDATION_ERROR');
    }

    uniqueKeys.add(key);

    return {
      business_unit_id: channel.business_unit_id,
      department_id: Number(channel.department_id),
      channel_name: channel.channel_name || null,
      channel_code: channel.channel_code || null,
      is_primary: normalizeBoolean(channel.is_primary, 0),
      is_active: normalizeBoolean(channel.is_active, 1),
    };
  });
}

function validateComponents(components = [], itemKind, isProvided = false) {
  if (components === undefined || components === null) {
    return [];
  }

  if (!Array.isArray(components)) {
    throw makeError('Components must be an array', 422, 'VALIDATION_ERROR');
  }

  if (itemKind !== 'bundle') {
    if (isProvided && components.length > 0) {
      throw makeError('Components are only allowed for bundle items', 422, 'VALIDATION_ERROR');
    }

    return [];
  }

  if (components.length < 2) {
    throw makeError('Bundle must have at least 2 components', 422, 'VALIDATION_ERROR');
  }

  if (components.length > 5) {
    throw makeError('Bundle can only have maximum 5 components', 422, 'VALIDATION_ERROR');
  }

  const uniqueComponentIds = new Set();

  return components.map((component, index) => {
    if (!component || typeof component !== 'object') {
      throw makeError(`Component at index ${index} is invalid`, 422, 'VALIDATION_ERROR');
    }

    if (!validateRequired(component.component_item_id)) {
      throw makeError(`Component item is required at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (String(component.component_item_id).length > STRING_LIMITS.component_item_id) {
      throw makeError(`Component item is invalid at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (uniqueComponentIds.has(component.component_item_id)) {
      throw makeError('Duplicate component item in request', 422, 'VALIDATION_ERROR');
    }

    uniqueComponentIds.add(component.component_item_id);

    if (!isValidPositiveDecimal(component.qty)) {
      throw makeError(`Component qty must be greater than 0 at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (
      component.sort_order !== undefined &&
      component.sort_order !== null &&
      component.sort_order !== '' &&
      (!isValidInteger(component.sort_order) || Number(component.sort_order) <= 0)
    ) {
      throw makeError(`Component sort order must be a valid integer at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    return {
      component_item_id: component.component_item_id,
      qty: Number(component.qty),
      sort_order: component.sort_order ? Number(component.sort_order) : index + 1,
    };
  });
}

function generateNextBarcode(lastBarcode) {
  const now = new Date();
  const yearTwoDigits = String(now.getFullYear()).slice(-2);
  const prefix = `68${yearTwoDigits}`;

  if (!lastBarcode) {
    return `${prefix}00000001`;
  }

  const lastSequence = parseInt(String(lastBarcode).slice(4), 10) || 0;
  const nextSequence = lastSequence + 1;

  return `${prefix}${String(nextSequence).padStart(8, '0')}`;
}

function buildBundleItemName(componentsWithItems = []) {
  const parts = componentsWithItems
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((component) => {
      return `${normalizeQty(component.qty)} ${component.item.item_name}`;
    });

  return `BUNDLE ${parts.join(' + ')}`;
}

async function validateReferences(payload, connection) {
  if (payload.parent_id) {
    const parent = await ItemModel.findParentById(payload.parent_id, connection);

    if (!parent) {
      throw makeError('Parent item not found', 404, 'PARENT_NOT_FOUND');
    }
  }

  if (payload.uom_id) {
    const uom = await ItemModel.findUomById(payload.uom_id, connection);

    if (!uom) {
      throw makeError('UOM not found', 404, 'UOM_NOT_FOUND');
    }
  }

  if (payload.sku_status_id) {
    const skuStatus = await ItemModel.findSkuStatusById(payload.sku_status_id, connection);

    if (!skuStatus) {
      throw makeError('SKU status not found', 404, 'SKU_STATUS_NOT_FOUND');
    }
  }

  if (payload.business_unit_id) {
    const businessUnit = await ItemModel.findBusinessUnitById(payload.business_unit_id);

    if (!businessUnit) {
      throw makeError('Business unit not found or inactive', 404, 'BUSINESS_UNIT_NOT_FOUND');
    }
  }
}

async function validateChannelsAgainstCentral(channels = []) {
  for (const channel of channels) {
    const pair = await ItemModel.findBusinessUnitDepartmentPair(
      channel.business_unit_id,
      channel.department_id
    );

    if (!pair) {
      throw makeError(
        `Department ${channel.department_id} is not valid for business unit ${channel.business_unit_id}`,
        422,
        'INVALID_CHANNEL_DEPARTMENT'
      );
    }
  }
}

async function validateBundleComponents(components = [], connection) {
  if (!components.length) {
    return [];
  }

  const componentItemIds = components.map((component) => component.component_item_id);
  const componentItems = await ItemModel.findItemsByIds(componentItemIds, connection);
  const componentItemMap = new Map(componentItems.map((item) => [item.id, item]));

  const missingComponentIds = componentItemIds.filter((id) => !componentItemMap.has(id));

  if (missingComponentIds.length) {
    throw makeError('One or more component items not found', 404, 'COMPONENT_ITEM_NOT_FOUND');
  }

  const bundleComponentIds = componentItems
    .filter((item) => item.item_kind === 'bundle')
    .map((item) => item.id);

  if (bundleComponentIds.length) {
    throw makeError(
      'Bundle item cannot be used as component',
      422,
      'INVALID_BUNDLE_COMPONENT',
      {
        component_item_id: 'Component item must be a regular item',
      }
    );
  }

  return components.map((component) => ({
    ...component,
    item: componentItemMap.get(component.component_item_id),
  }));
}

function normalizeItemData(payload, userId, generatedCode = null, existing = null) {
  return {
    id: existing?.id || crypto.randomUUID(),
    item_code: existing?.item_code || generatedCode,
    barcode: existing?.barcode || generatedCode,
    item_name: payload.item_name,
    item_kind: payload.item_kind,
    parent_id: payload.parent_id,
    uom_id: payload.uom_id || null,
    sku_status_id: payload.sku_status_id || null,
    business_unit_id: payload.business_unit_id,
    variant: payload.variant || null,
    qty_per_pack: normalizeNumber(payload.qty_per_pack),
    height: normalizeNumber(payload.height),
    width: normalizeNumber(payload.width),
    depth: normalizeNumber(payload.depth),
    gross_weight_pack: normalizeNumber(payload.gross_weight_pack),
    container_20ft_qty: normalizeNumber(payload.container_20ft_qty),
    container_40hq_qty: normalizeNumber(payload.container_40hq_qty),
    production_time_days: normalizeNumber(payload.production_time_days),
    is_active: normalizeBoolean(payload.is_active, existing?.is_active ?? 1),
    created_by: existing?.created_by || userId,
    updated_by: userId,
  };
}

async function index(query) {
  return ItemModel.findAll(query);
}

async function show(id) {
  const item = await ItemModel.findById(id);

  if (!item) {
    throw makeError('Item not found', 404, 'ITEM_NOT_FOUND');
  }

  return item;
}

async function store(payload, userId) {
  const errors = validateBasePayload(payload, 'create');

  if (Object.keys(errors).length) {
    throw makeError('Validation failed', 422, 'VALIDATION_ERROR', errors);
  }

  const channels = validateChannels(payload.channels || []);
  const components = validateComponents(
    payload.components || [],
    payload.item_kind,
    payload.components !== undefined
  );

  await validateChannelsAgainstCentral(channels);

  return ItemModel.transaction(async (connection) => {
    await validateReferences(payload, connection);

    const yearTwoDigits = String(new Date().getFullYear()).slice(-2);
    const lastBarcode = await ItemModel.findLastBarcodeByYear(yearTwoDigits, connection);
    const generatedCode = generateNextBarcode(lastBarcode);

    let finalPayload = {
      ...payload,
    };

    let componentsWithItems = [];

    if (payload.item_kind === 'bundle') {
      componentsWithItems = await validateBundleComponents(components, connection);

      const generatedBundleName = buildBundleItemName(componentsWithItems);
      validateGeneratedBundleName(generatedBundleName);

      finalPayload = {
        ...payload,
        item_name: generatedBundleName,
      };
    }

    const itemData = normalizeItemData(finalPayload, userId, generatedCode);
    const createdItem = await ItemModel.create(itemData, connection);

    await ItemModel.replaceChannels(createdItem.id, channels, connection);

    if (payload.item_kind === 'bundle') {
      await ItemModel.replaceComponents(createdItem.id, components, connection);
    }

    return ItemModel.findById(createdItem.id, connection);
  });
}

async function update(id, payload, userId) {
  const existing = await ItemModel.findRawById(id);

  if (!existing) {
    throw makeError('Item not found', 404, 'ITEM_NOT_FOUND');
  }

  validateImmutableItemKind(existing, payload);

  const generatedFieldErrors = validateGeneratedFields(payload, 'update');

  if (Object.keys(generatedFieldErrors).length) {
    throw makeError('Validation failed', 422, 'VALIDATION_ERROR', generatedFieldErrors);
  }

  const mergedPayload = {
    item_kind: payload.item_kind ?? existing.item_kind,
    parent_id: payload.parent_id ?? existing.parent_id,
    uom_id: payload.uom_id ?? existing.uom_id,
    sku_status_id: payload.sku_status_id ?? existing.sku_status_id,
    business_unit_id: payload.business_unit_id ?? existing.business_unit_id,
    item_name: payload.item_name ?? existing.item_name,
    variant: payload.variant ?? existing.variant,
    qty_per_pack: payload.qty_per_pack ?? existing.qty_per_pack,
    height: payload.height ?? existing.height,
    width: payload.width ?? existing.width,
    depth: payload.depth ?? existing.depth,
    gross_weight_pack: payload.gross_weight_pack ?? existing.gross_weight_pack,
    container_20ft_qty: payload.container_20ft_qty ?? existing.container_20ft_qty,
    container_40hq_qty: payload.container_40hq_qty ?? existing.container_40hq_qty,
    production_time_days: payload.production_time_days ?? existing.production_time_days,
    is_active: payload.is_active ?? existing.is_active,
  };

  const errors = validateBasePayload(mergedPayload, 'update');

  if (Object.keys(errors).length) {
    throw makeError('Validation failed', 422, 'VALIDATION_ERROR', errors);
  }

  const shouldReplaceChannels = payload.channels !== undefined;
  const shouldReplaceComponents = payload.components !== undefined;

  const channels = shouldReplaceChannels
    ? validateChannels(payload.channels || [])
    : null;

  const components = shouldReplaceComponents
    ? validateComponents(payload.components || [], mergedPayload.item_kind, true)
    : null;

  if (channels) {
    await validateChannelsAgainstCentral(channels);
  }

  return ItemModel.transaction(async (connection) => {
    await validateReferences(mergedPayload, connection);

    let finalPayload = {
      ...mergedPayload,
    };

    if (mergedPayload.item_kind === 'bundle' && components) {
      const componentsWithItems = await validateBundleComponents(components, connection);

      const generatedBundleName = buildBundleItemName(componentsWithItems);
      validateGeneratedBundleName(generatedBundleName);

      finalPayload = {
        ...mergedPayload,
        item_name: generatedBundleName,
      };
    }

    const itemData = normalizeItemData(finalPayload, userId, null, existing);
    const updatedItem = await ItemModel.update(id, itemData, connection);

    if (shouldReplaceChannels) {
      await ItemModel.replaceChannels(updatedItem.id, channels, connection);
    }

    if (mergedPayload.item_kind === 'bundle' && shouldReplaceComponents) {
      await ItemModel.replaceComponents(updatedItem.id, components, connection);
    }

    if (mergedPayload.item_kind === 'regular') {
      await ItemModel.deleteComponents(updatedItem.id, connection);
    }

    return ItemModel.findById(updatedItem.id, connection);
  });
}

module.exports = {
  index,
  show,
  store,
  update,
};