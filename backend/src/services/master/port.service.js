const PortModel = require('../../models/master/port.model');

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizePayload(payload) {
  return {
    code: payload.code,
    name: payload.name,
    is_active: payload.is_active ?? 1,
  };
}

function validatePayload(payload) {
  if (!payload.code || String(payload.code).trim() === '') {
    throw makeError('Code is required', 422, 'VALIDATION_ERROR');
  }

  if (!payload.name || String(payload.name).trim() === '') {
    throw makeError('Name is required', 422, 'VALIDATION_ERROR');
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