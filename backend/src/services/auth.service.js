const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');
const UserModel = require('../models/user.model');

let _devTokenCache = { token: null, exp: 0 };

function createHttpError(message, statusCode = 500, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function throwUnauthorized(message, code = 'UNAUTHORIZED') {
  throw createHttpError(message, 401, code);
}

async function fetchTokenFromPilargroup(username, password) {
  const url = `${config.pilargroup.url}/api/auth/login`;

  const res = await axios.post(
    url,
    { username, password },
    { timeout: 10_000 }
  );

  const token =
    res.data?.token ||
    res.data?.access_token ||
    res.data?.data?.token ||
    res.data?.data?.access_token;

  if (!token) {
    throw createHttpError('Token not found in pilargroup response', 500, 'CENTRAL_LOGIN_INVALID_RESPONSE');
  }

  return token;
}

async function getDevToken() {
  const now = Math.floor(Date.now() / 1000);

  if (_devTokenCache.token && _devTokenCache.exp - 60 > now) {
    return _devTokenCache.token;
  }

  const token = await fetchTokenFromPilargroup(
    config.dev.authUsername,
    config.dev.authPassword
  );

  const decoded = jwt.decode(token);

  _devTokenCache = {
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

async function resolveToken(bearerToken) {
  const token = await resolveRawToken(bearerToken);
  const decoded = verifyToken(token);

  const userId = decoded?.sub || decoded?.id;

  if (!userId) {
    throwUnauthorized('User id not found in token', 'TOKEN_INVALID_PAYLOAD');
  }

  const user = await UserModel.findFullProfileById(userId);

  if (!user) {
    throwUnauthorized('User not found', 'USER_NOT_FOUND');
  }

  if (Number(user.is_active) !== 1) {
    throwUnauthorized('User is inactive', 'USER_INACTIVE');
  }

  const tokenVersion = decoded?.token_version;

  if (tokenVersion !== undefined && tokenVersion !== null) {
    if (Number(tokenVersion) !== Number(user.token_version)) {
      throwUnauthorized('Session is no longer valid', 'TOKEN_REVOKED');
    }
  }

  return {
    token,
    decoded,
    user,
  };
}

async function getUserById(id) {
  const user = await UserModel.findFullProfileById(id);

  if (!user) {
    throw createHttpError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}

module.exports = {
  resolveToken,
  verifyToken,
  decodeToken,
  getDevToken,
  getUserById,
};