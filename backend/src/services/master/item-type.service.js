const ItemTypeModel = require('../../models/master/item-type.model');

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizePayload(payload) {
  return {
    code: String(payload.code).trim(),
    name: String(payload.name).trim(),
    is_active: payload.is_active ?? 1,
  };
}

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

function isValidBoolean(value) {
  return [0, 1, '0', '1', true, false].includes(value);
}

function validatePayload(payload) {
  const errors = {};

  if (!validateRequired(payload.code)) {
    errors.code = 'Code is required';
  }

  if (!validateRequired(payload.name)) {
    errors.name = 'Name is required';
  }

  if (hasValue(payload.code) && String(payload.code).length > 50) {
    errors.code = 'Code cannot be longer than 50 characters';
  }

  if (hasValue(payload.name) && String(payload.name).length > 100) {
    errors.name = 'Name cannot be longer than 100 characters';
  }

  if (hasValue(payload.is_active) && !isValidBoolean(payload.is_active)) {
    errors.is_active = 'Is active must be 0 or 1';
  }

  if (Object.keys(errors).length) {
    throw makeError('Validation failed', 422, 'VALIDATION_ERROR', errors);
  }
}

async function index(query) {
  return ItemTypeModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const itemType = await ItemTypeModel.findById(id);

  if (!itemType) {
    throw makeError('Item type not found', 404, 'ITEM_TYPE_NOT_FOUND');
  }

  return itemType;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await ItemTypeModel.create(normalizedPayload);
  const createdItemType = await ItemTypeModel.findById(createdId);

  return {
    message: 'Item type created successfully',
    data: createdItemType,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await ItemTypeModel.update(id, normalizedPayload);

  const updatedItemType = await ItemTypeModel.findById(id);

  return {
    message: 'Item type updated successfully',
    data: updatedItemType,
  };
}

async function destroy(id) {
  await show(id);

  const usedCount = await ItemTypeModel.countUsedByItemParents(id);

  if (usedCount > 0) {
    throw makeError('Item type is already used by item parents', 409, 'MASTER_DATA_IN_USE');
  }

  await ItemTypeModel.remove(id);

  return {
    message: 'Item type deleted successfully',
  };
}

async function updateStatus(id, is_active) {
  await show(id);

  if (!isValidBoolean(is_active)) {
    throw makeError('is_active must be 0 or 1', 422, 'VALIDATION_ERROR');
  }

  await ItemTypeModel.updateStatus(id, Number(is_active));

  const updatedItemType = await ItemTypeModel.findById(id);

  return {
    message: 'Item type status updated successfully',
    data: updatedItemType,
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  updateStatus,
  destroy,
};