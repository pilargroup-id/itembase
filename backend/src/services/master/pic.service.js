const PicModel = require('../../models/master/pic.model');

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
  return PicModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const pic = await PicModel.findById(id);

  if (!pic) {
    const error = new Error('PIC not found');
    error.statusCode = 404;
    error.code = 'PIC_NOT_FOUND';
    throw error;
  }

  return pic;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await PicModel.create(normalizedPayload);
  const createdPic = await PicModel.findById(createdId);

  return {
    message: 'PIC created successfully',
    data: createdPic,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await PicModel.update(id, normalizedPayload);

  const updatedPic = await PicModel.findById(id);

  return {
    message: 'PIC updated successfully',
    data: updatedPic,
  };
}

async function destroy(id) {
  await show(id);

  const usedCount = await PicModel.countUsedByCategories(id);

  if (usedCount > 0) {
    const error = new Error('PIC is already used by categories');
    error.statusCode = 409;
    error.code = 'MASTER_DATA_IN_USE';
    throw error;
  }

  await PicModel.remove(id);

  return {
    message: 'PIC deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};