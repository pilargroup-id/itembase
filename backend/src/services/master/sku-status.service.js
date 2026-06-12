const SkuStatusModel = require('../../models/master/sku-status.model');

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
  await SkuStatusModel.remove(id);

  return {
    message: 'SKU status deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};