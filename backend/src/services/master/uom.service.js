const UomModel = require('../../models/master/uom.model');

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
  return UomModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const uom = await UomModel.findById(id);

  if (!uom) {
    throw makeError('UOM not found', 404, 'UOM_NOT_FOUND');
  }

  return uom;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await UomModel.create(normalizedPayload);
  const createdUom = await UomModel.findById(createdId);

  return {
    message: 'UOM created successfully',
    data: createdUom,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await UomModel.update(id, normalizedPayload);

  const updatedUom = await UomModel.findById(id);

  return {
    message: 'UOM updated successfully',
    data: updatedUom,
  };
}

async function destroy(id) {
  await show(id);
  await UomModel.remove(id);

  return {
    message: 'UOM deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};