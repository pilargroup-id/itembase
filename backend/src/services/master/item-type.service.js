const ItemTypeModel = require('../../models/master/item-type.model');
const ActivityLogService = require('../activity-log.service');

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
  const data = await ItemTypeModel.findById(id);

  if (!data) {
    throw makeError('Item type not found', 404, 'ITEM_TYPE_NOT_FOUND');
  }

  return data;
}

async function store(payload, userId = null, req = null) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await ItemTypeModel.create(normalizedPayload);
  const createdData = await ItemTypeModel.findById(createdId);

  await ActivityLogService.log({
    user_id: userId,
    action: 'CREATE',
    entity_type: 'master_item_types',
    entity_id: createdData.id,
    description: `Created item type ${createdData.name}`,
    before_data: null,
    after_data: createdData,
    metadata: {
      code: createdData.code,
      name: createdData.name,
      is_active: createdData.is_active,
    },
    req,
  });

  return {
    message: 'Item type created successfully',
    data: createdData,
  };
}

async function update(id, payload, userId = null, req = null) {
  const existingData = await show(id);

  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await ItemTypeModel.update(id, normalizedPayload);

  const updatedData = await ItemTypeModel.findById(id);

  await ActivityLogService.log({
    user_id: userId,
    action: Number(existingData.is_active) !== Number(updatedData.is_active)
      ? 'STATUS_CHANGE'
      : 'UPDATE',
    entity_type: 'master_item_types',
    entity_id: updatedData.id,
    description: Number(existingData.is_active) !== Number(updatedData.is_active)
      ? `Changed item type ${updatedData.name} active status`
      : `Updated item type ${updatedData.name}`,
    before_data: existingData,
    after_data: updatedData,
    metadata: {
      code: updatedData.code,
      name: updatedData.name,
      old_is_active: existingData.is_active,
      new_is_active: updatedData.is_active,
    },
    req,
  });

  return {
    message: 'Item type updated successfully',
    data: updatedData,
  };
}

async function destroy(id, userId = null, req = null) {
  const existingData = await show(id);

  const usedCount = await ItemTypeModel.countUsedByItemParents(id);

  if (usedCount > 0) {
    throw makeError('Item type is already used by item parents', 409, 'MASTER_DATA_IN_USE');
  }

  await ItemTypeModel.remove(id);

  await ActivityLogService.log({
    user_id: userId,
    action: 'DELETE',
    entity_type: 'master_item_types',
    entity_id: existingData.id,
    description: `Deleted item type ${existingData.name}`,
    before_data: existingData,
    after_data: null,
    metadata: {
      code: existingData.code,
      name: existingData.name,
      is_active: existingData.is_active,
    },
    req,
  });

  return {
    message: 'Item type deleted successfully',
  };
}

async function updateStatus(id, is_active, userId = null, req = null) {
  const existingData = await show(id);

  if (!isValidBoolean(is_active)) {
    throw makeError('is_active must be 0 or 1', 422, 'VALIDATION_ERROR');
  }

  await ItemTypeModel.updateStatus(id, Number(is_active));

  const updatedData = await ItemTypeModel.findById(id);

  await ActivityLogService.log({
    user_id: userId,
    action: 'STATUS_CHANGE',
    entity_type: 'master_item_types',
    entity_id: updatedData.id,
    description: `Changed item type ${updatedData.name} active status`,
    before_data: existingData,
    after_data: updatedData,
    metadata: {
      code: updatedData.code,
      name: updatedData.name,
      old_is_active: existingData.is_active,
      new_is_active: updatedData.is_active,
    },
    req,
  });

  return {
    message: 'Item type status updated successfully',
    data: updatedData,
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
