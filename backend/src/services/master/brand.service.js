const BrandModel = require('../../models/master/brand.model');

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
  return BrandModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const brand = await BrandModel.findById(id);

  if (!brand) {
    const error = new Error('Brand not found');
    error.statusCode = 404;
    error.code = 'BRAND_NOT_FOUND';
    throw error;
  }

  return brand;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await BrandModel.create(normalizedPayload);
  const createdBrand = await BrandModel.findById(createdId);

  return {
    message: 'Brand created successfully',
    data: createdBrand,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await BrandModel.update(id, normalizedPayload);

  const updatedBrand = await BrandModel.findById(id);

  return {
    message: 'Brand updated successfully',
    data: updatedBrand,
  };
}

async function destroy(id) {
  await show(id);

  const usedCount = await BrandModel.countUsedByItemParents(id);

  if (usedCount > 0) {
    const error = new Error('Brand is already used by item parents');
    error.statusCode = 409;
    error.code = 'MASTER_DATA_IN_USE';
    throw error;
  }

  await BrandModel.remove(id);

  return {
    message: 'Brand deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};