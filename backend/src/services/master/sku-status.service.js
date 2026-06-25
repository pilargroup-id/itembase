const SkuStatusModel = require('../../models/master/sku-status.model');

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
  return SkuStatusModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const skuStatus = await SkuStatusModel.findById(id);

  if (!skuStatus) {
    throw makeError('SKU status not found', 404, 'SKU_STATUS_NOT_FOUND');
  }

  return skuStatus;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await SkuStatusModel.create(normalizedPayload);
  const createdSkuStatus = await SkuStatusModel.findById(createdId);

  return {
    message: 'SKU status created successfully',
    data: createdSkuStatus,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await SkuStatusModel.update(id, normalizedPayload);

  const updatedSkuStatus = await SkuStatusModel.findById(id);

  return {
    message: 'SKU status updated successfully',
    data: updatedSkuStatus,
  };
}

async function destroy(id) {
  await show(id);

  const usedCount = await SkuStatusModel.countUsedByItems(id);

  if (usedCount > 0) {
    throw makeError('SKU status is already used by items', 409, 'MASTER_DATA_IN_USE');
  }

  await SkuStatusModel.remove(id);

  return {
    message: 'SKU status deleted successfully',
  };
}

async function updateStatus(id, is_active) {
  await show(id);

  if (!isValidBoolean(is_active)) {
    throw makeError('is_active must be 0 or 1', 422, 'VALIDATION_ERROR');
  }

  await SkuStatusModel.updateStatus(id, Number(is_active));

  const updatedSkuStatus = await SkuStatusModel.findById(id);

  return {
    message: 'SKU status updated successfully',
    data: updatedSkuStatus,
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