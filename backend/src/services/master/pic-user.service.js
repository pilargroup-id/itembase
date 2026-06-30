const PicUserModel = require('../../models/master/pic-user.model');
const ActivityLogService = require('../activity-log.service');

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function isValidBoolean(value) {
  return [0, 1, '0', '1', true, false].includes(value);
}

function normalizeBoolean(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return Number(value) ? 1 : 0;
}

function normalizeUsers(users) {
  const hasPrimary = users.some((user) => normalizeBoolean(user.is_primary, 0) === 1);

  return users.map((user, index) => ({
    central_user_id: String(user.central_user_id).trim(),
    is_primary: hasPrimary
      ? normalizeBoolean(user.is_primary, 0)
      : (index === 0 ? 1 : 0),
    is_active: normalizeBoolean(user.is_active, 1),
  }));
}

function validateUsers(users) {
  if (!Array.isArray(users) || users.length === 0) {
    throw makeError('Users are required', 422, 'VALIDATION_ERROR');
  }

  const centralUserIds = [];

  users.forEach((user, index) => {
    if (!user || typeof user !== 'object') {
      throw makeError(`User at index ${index} is invalid`, 422, 'VALIDATION_ERROR');
    }

    if (!user.central_user_id || String(user.central_user_id).trim() === '') {
      throw makeError(`Central user is required at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (String(user.central_user_id).length > 36) {
      throw makeError(`Central user is invalid at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (hasValue(user.is_primary) && !isValidBoolean(user.is_primary)) {
      throw makeError(`Is primary must be 0 or 1 at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    if (hasValue(user.is_active) && !isValidBoolean(user.is_active)) {
      throw makeError(`Is active must be 0 or 1 at index ${index}`, 422, 'VALIDATION_ERROR');
    }

    centralUserIds.push(String(user.central_user_id).trim());
  });

  const uniqueCentralUserIds = new Set(centralUserIds);

  if (uniqueCentralUserIds.size !== centralUserIds.length) {
    throw makeError('Duplicate central user in request', 422, 'VALIDATION_ERROR');
  }

  const primaryCount = users.filter(
    (user) => normalizeBoolean(user.is_primary, 0) === 1
  ).length;

  if (primaryCount > 1) {
    throw makeError('Only one primary user is allowed', 422, 'VALIDATION_ERROR');
  }
}

function validatePicId(picId) {
  if (!picId || String(picId).trim() === '') {
    throw makeError('PIC is required', 422, 'VALIDATION_ERROR');
  }

  if (String(picId).length > 36) {
    throw makeError('PIC is invalid', 422, 'VALIDATION_ERROR');
  }
}

async function validatePicExists(picId) {
  const pic = await PicUserModel.findPicById(picId);

  if (!pic) {
    throw makeError('PIC not found', 404, 'PIC_NOT_FOUND');
  }

  return pic;
}

async function validateCentralUsersExist(users) {
  const centralUserIds = users.map((user) => user.central_user_id);
  const centralUsers = await PicUserModel.findCentralUsersByIds(centralUserIds);
  const foundIds = new Set(centralUsers.map((user) => user.id));

  const missingIds = centralUserIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw makeError('One or more central users not found', 404, 'CENTRAL_USER_NOT_FOUND');
  }
}

async function index(query) {
  return PicUserModel.findAll({
    search: query.search,
    pic_id: query.pic_id,
    central_user_id: query.central_user_id,
    is_primary: query.is_primary,
    is_active: query.is_active,
  });
}

async function options(query) {
  const pics = await PicUserModel.findActivePics();

  const users = await PicUserModel.findCentralUsersByDepartment({
    active: query.active ?? 1,
    search: query.search,
  });

  return {
    pics,
    users,
  };
}

async function show(id) {
  const picUser = await PicUserModel.findById(id);

  if (!picUser) {
    throw makeError('PIC user not found', 404, 'PIC_USER_NOT_FOUND');
  }

  return picUser;
}

async function store(payload, userId = null, req = null) {
  validatePicId(payload.pic_id);
  validateUsers(payload.users);

  const normalizedPicId = String(payload.pic_id).trim();
  const normalizedUsers = normalizeUsers(payload.users);

  const pic = await validatePicExists(normalizedPicId);
  await validateCentralUsersExist(normalizedUsers);

  const createdPicUsers = await PicUserModel.createMany(normalizedPicId, normalizedUsers);

  await ActivityLogService.log({
    user_id: userId,
    action: 'CREATE',
    entity_type: 'master_pic_users',
    entity_id: normalizedPicId,
    description: `Created PIC users for ${pic.name}`,
    before_data: null,
    after_data: createdPicUsers,
    metadata: {
      pic_id: normalizedPicId,
      pic_code: pic.code,
      pic_name: pic.name,
      total_users: createdPicUsers.length,
      payload_count: normalizedUsers.length,
    },
    req,
  });

  return {
    message: 'PIC users created successfully',
    data: createdPicUsers,
  };
}

async function update(picId, payload, userId = null, req = null) {
  validatePicId(picId);
  validateUsers(payload.users);

  const normalizedPicId = String(picId).trim();
  const normalizedUsers = normalizeUsers(payload.users);

  const pic = await validatePicExists(normalizedPicId);
  await validateCentralUsersExist(normalizedUsers);

  const beforeData = await PicUserModel.findByPicId(normalizedPicId);
  const updatedPicUsers = await PicUserModel.syncByPicId(normalizedPicId, normalizedUsers);

  await ActivityLogService.log({
    user_id: userId,
    action: 'SYNC',
    entity_type: 'master_pic_users',
    entity_id: normalizedPicId,
    description: `Synced PIC users for ${pic.name}`,
    before_data: beforeData,
    after_data: updatedPicUsers,
    metadata: {
      pic_id: normalizedPicId,
      pic_code: pic.code,
      pic_name: pic.name,
      before_count: beforeData.length,
      after_count: updatedPicUsers.length,
      payload_count: normalizedUsers.length,
    },
    req,
  });

  return {
    message: 'PIC users updated successfully',
    data: updatedPicUsers,
  };
}

async function destroy(id, userId = null, req = null) {
  const existingPicUser = await show(id);

  const deletedData = await PicUserModel.remove(id);

  await ActivityLogService.log({
    user_id: userId,
    action: 'DELETE',
    entity_type: 'master_pic_users',
    entity_id: existingPicUser.id,
    description: `Deleted PIC user ${existingPicUser.central_user_id}`,
    before_data: existingPicUser,
    after_data: null,
    metadata: {
      pic_id: existingPicUser.pic_id,
      pic_code: existingPicUser.pic_code,
      pic_name: existingPicUser.pic_name,
      central_user_id: existingPicUser.central_user_id,
      was_primary: Number(existingPicUser.is_primary) === 1,
      deleted_data: deletedData,
    },
    req,
  });

  return {
    message: 'PIC user deleted successfully',
  };
}

async function updateStatus(id, is_active, userId = null, req = null) {
  const existingPicUser = await show(id);

  if (!isValidBoolean(is_active)) {
    throw makeError('is_active must be 0 or 1', 422, 'VALIDATION_ERROR');
  }

  await PicUserModel.updateStatus(id, Number(is_active));

  const updatedPicUser = await PicUserModel.findById(id);

  await ActivityLogService.log({
    user_id: userId,
    action: 'STATUS_CHANGE',
    entity_type: 'master_pic_users',
    entity_id: updatedPicUser.id,
    description: `Changed PIC user ${updatedPicUser.central_user_id} active status`,
    before_data: existingPicUser,
    after_data: updatedPicUser,
    metadata: {
      pic_id: updatedPicUser.pic_id,
      pic_code: updatedPicUser.pic_code,
      pic_name: updatedPicUser.pic_name,
      central_user_id: updatedPicUser.central_user_id,
      old_is_active: existingPicUser.is_active,
      new_is_active: updatedPicUser.is_active,
    },
    req,
  });

  return {
    message: 'PIC user status updated successfully',
    data: updatedPicUser,
  };
}

module.exports = {
  index,
  show,
  options,
  store,
  update,
  updateStatus,
  destroy,
};
