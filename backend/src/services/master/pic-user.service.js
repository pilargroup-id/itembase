const PicUserModel = require('../../models/master/pic-user.model');

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

async function store(payload) {
  validatePicId(payload.pic_id);
  validateUsers(payload.users);

  const normalizedPicId = String(payload.pic_id).trim();
  const normalizedUsers = normalizeUsers(payload.users);

  await validatePicExists(normalizedPicId);
  await validateCentralUsersExist(normalizedUsers);

  const createdPicUsers = await PicUserModel.createMany(normalizedPicId, normalizedUsers);

  return {
    message: 'PIC users created successfully',
    data: createdPicUsers,
  };
}

async function update(picId, payload) {
  validatePicId(picId);
  validateUsers(payload.users);

  const normalizedPicId = String(picId).trim();
  const normalizedUsers = normalizeUsers(payload.users);

  await validatePicExists(normalizedPicId);
  await validateCentralUsersExist(normalizedUsers);

  const updatedPicUsers = await PicUserModel.syncByPicId(normalizedPicId, normalizedUsers);

  return {
    message: 'PIC users updated successfully',
    data: updatedPicUsers,
  };
}

async function destroy(id) {
  await show(id);
  await PicUserModel.remove(id);

  return {
    message: 'PIC user deleted successfully',
  };
}

async function updateStatus(id, is_active) {
  await show(id);

  if (!isValidBoolean(is_active)) {
    throw makeError('is_active must be 0 or 1', 422, 'VALIDATION_ERROR');
  }

  await PicUserModel.updateStatus(id, Number(is_active));

  const updatedPicUser = await PicUserModel.findById(id);

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