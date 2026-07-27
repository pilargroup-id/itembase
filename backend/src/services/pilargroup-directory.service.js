const axios = require('axios');
const config = require('../config');

const DIRECTORY_TIMEOUT_MS = 10_000;

function createHttpError(message, statusCode = 500, code = 'PILARGROUP_DIRECTORY_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizePayload(payload, fallbackMessage) {
  const data = payload?.data;

  if (!Array.isArray(data)) {
    throw createHttpError(
      fallbackMessage,
      502,
      'PILARGROUP_DIRECTORY_INVALID_RESPONSE'
    );
  }

  return data;
}

async function get(path) {
  try {
    const response = await axios.get(`${config.pilargroup.url}${path}`, {
      timeout: DIRECTORY_TIMEOUT_MS,
      headers: {
        'X-Internal-Secret': config.pilargroup.internalSyncSecret,
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const statusCode = error.response?.status || 502;
    const message =
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch Pilargroup directory';
    const code =
      error.response?.data?.code ||
      error.code ||
      'PILARGROUP_DIRECTORY_REQUEST_FAILED';

    throw createHttpError(message, statusCode, code);
  }
}

async function getUsers() {
  const payload = await get('/api/internal/directory/users');
  return normalizePayload(payload, 'Invalid users response from Pilargroup');
}

async function getDepartments() {
  const payload = await get('/api/internal/directory/departments');
  return normalizePayload(payload, 'Invalid departments response from Pilargroup');
}

async function getBusinessUnits() {
  const payload = await get('/api/internal/directory/business-units');
  return normalizePayload(payload, 'Invalid business units response from Pilargroup');
}

async function getBusinessUnitDepartments(businessUnitId) {
  if (!businessUnitId) {
    return [];
  }

  const encodedId = encodeURIComponent(String(businessUnitId));
  const payload = await get(
    `/api/internal/directory/business-units/${encodedId}/departments`
  );

  return normalizePayload(
    payload,
    'Invalid business unit departments response from Pilargroup'
  );
}

function findUsersByIds(users, ids = []) {
  const idSet = new Set(ids.filter(Boolean).map((id) => String(id)));
  return users.filter((user) => idSet.has(String(user.id)));
}

function findDepartmentsByIds(departments, ids = []) {
  const idSet = new Set(
    ids
      .filter((id) => id !== undefined && id !== null)
      .map((id) => Number(id))
  );

  return departments.filter((department) => idSet.has(Number(department.id)));
}

function findBusinessUnitsByIds(businessUnits, ids = []) {
  const idSet = new Set(ids.filter(Boolean).map((id) => String(id)));
  return businessUnits.filter((businessUnit) => idSet.has(String(businessUnit.id)));
}

module.exports = {
  getUsers,
  getDepartments,
  getBusinessUnits,
  getBusinessUnitDepartments,
  findUsersByIds,
  findDepartmentsByIds,
  findBusinessUnitsByIds,
};
