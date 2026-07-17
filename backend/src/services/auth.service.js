const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');

let devTokenCache = { token: null, exp: 0 };

function createHttpError(message, statusCode = 500, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function throwUnauthorized(message, code = 'UNAUTHORIZED') {
  throw createHttpError(message, 401, code);
}

function getAxiosErrorCode(error) {
  return error.response?.data?.code || error.code || null;
}

function getAxiosErrorMessage(error, fallbackMessage) {
  return error.response?.data?.message || error.message || fallbackMessage;
}

async function fetchTokenFromPilargroup(username, password) {
  const url = `${config.pilargroup.url}/api/auth/login`;

  try {
    const response = await axios.post(
      url,
      { username, password },
      { timeout: 10_000 }
    );

    const token =
      response.data?.token ||
      response.data?.access_token ||
      response.data?.data?.token ||
      response.data?.data?.access_token;

    if (!token) {
      throw createHttpError(
        'Token not found in pilargroup response',
        500,
        'CENTRAL_LOGIN_INVALID_RESPONSE'
      );
    }

    return token;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const statusCode = error.response?.status || 500;
    const message = getAxiosErrorMessage(error, 'Failed to login to pilargroup');
    const code = getAxiosErrorCode(error) || 'CENTRAL_LOGIN_FAILED';

    throw createHttpError(message, statusCode, code);
  }
}

async function getDevToken() {
  const now = Math.floor(Date.now() / 1000);

  if (devTokenCache.token && devTokenCache.exp - 60 > now) {
    return devTokenCache.token;
  }

  const token = await fetchTokenFromPilargroup(
    config.dev.authUsername,
    config.dev.authPassword
  );

  const decoded = jwt.decode(token);

  devTokenCache = {
    token,
    exp: decoded?.exp || now + 3600,
  };

  return token;
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function decodeToken(token) {
  return jwt.decode(token);
}

async function resolveRawToken(bearerToken) {
  const isDev = config.app.env === 'development';

  if (isDev && config.dev.authEnabled && !bearerToken) {
    return getDevToken();
  }

  if (!bearerToken) {
    throwUnauthorized('Token not found', 'TOKEN_MISSING');
  }

  return bearerToken;
}

function normalizeAuthMeResponse(payload) {
  const user = payload?.data?.user || payload?.data || payload?.user || payload;

  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw createHttpError(
      'Invalid auth/me response from pilargroup',
      502,
      'CENTRAL_AUTH_ME_INVALID_RESPONSE'
    );
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];
  const companies = Array.isArray(user.companies) ? user.companies : [];
  const apps = Array.isArray(user.apps) ? user.apps : [];

  const primaryDepartment =
    departments.find((item) => Number(item.is_primary) === 1) ||
    departments[0] ||
    null;

  const primaryCompany =
    companies.find((item) => Number(item.is_primary) === 1) ||
    companies[0] ||
    null;

  return {
    ...user,
    departments,
    companies,
    apps,
    department_id: user.department_id ?? primaryDepartment?.id ?? null,
    department: user.department ?? primaryDepartment?.name ?? null,
    department_class: user.department_class ?? primaryDepartment?.class ?? null,
    department_code: user.department_code ?? primaryDepartment?.code ?? null,
    company_id: user.company_id ?? primaryCompany?.id ?? null,
    company: user.company ?? primaryCompany?.name ?? null,
    company_code: user.company_code ?? primaryCompany?.code ?? null,
    job_level_value:
      user.job_level_value === null || user.job_level_value === undefined
        ? null
        : Number(user.job_level_value),
    cv: user.cv ?? user.token_version ?? null,
  };
}

async function fetchProfileFromPilargroup(token) {
  const url = `${config.pilargroup.url}/api/auth/me`;

  try {
    const response = await axios.get(url, {
      timeout: 10_000,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    return normalizeAuthMeResponse(response.data);
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const statusCode = error.response?.status || 502;
    const message = getAxiosErrorMessage(
      error,
      'Failed to fetch profile from pilargroup'
    );
    const code = getAxiosErrorCode(error) || 'CENTRAL_AUTH_ME_FAILED';

    throw createHttpError(message, statusCode, code);
  }
}

async function resolveToken(bearerToken) {
  const token = await resolveRawToken(bearerToken);
  const decoded = verifyToken(token);
  const user = await fetchProfileFromPilargroup(token);

  if (!user.id) {
    throwUnauthorized('User id not found in auth/me response', 'USER_INVALID_PROFILE');
  }

  if (user.is_active !== undefined && user.is_active !== null) {
    if (Number(user.is_active) !== 1) {
      throwUnauthorized('User is inactive', 'USER_INACTIVE');
    }
  }

  return {
    token,
    decoded,
    user,
  };
}

async function getCurrentUser(token) {
  return fetchProfileFromPilargroup(token);
}

async function getUserById(id, token) {
  const user = await fetchProfileFromPilargroup(token);

  if (String(user.id) !== String(id)) {
    throw createHttpError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}

module.exports = {
  resolveToken,
  verifyToken,
  decodeToken,
  getDevToken,
  getCurrentUser,
  getUserById,
};
