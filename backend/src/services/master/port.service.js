const PortModel = require('../../models/master/port.model');

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
  return PortModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const port = await PortModel.findById(id);

  if (!port) {
    throw makeError('Port not found', 404, 'PORT_NOT_FOUND');
  }

  return port;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await PortModel.create(normalizedPayload);
  const createdPort = await PortModel.findById(createdId);

  return {
    message: 'Port created successfully',
    data: createdPort,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await PortModel.update(id, normalizedPayload);

  const updatedPort = await PortModel.findById(id);

  return {
    message: 'Port updated successfully',
    data: updatedPort,
  };
}

async function destroy(id) {
  await show(id);

  const usedCount = await PortModel.countUsedByItemParents(id);

  if (usedCount > 0) {
    throw makeError('Port is already used by item parents', 409, 'MASTER_DATA_IN_USE');
  }

  await PortModel.remove(id);

  return {
    message: 'Port deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};