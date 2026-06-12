const ItemTypeModel = require('../../models/master/item-type.model');

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
  await ItemTypeModel.remove(id);

  return {
    message: 'Item type deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};