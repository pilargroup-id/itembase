const { resolveToken } = require('../services/auth.service');

function extractBearerToken(req) {
  const header = req.headers['authorization'] || '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim() || null;
}

async function authenticate(req, res, next) {
  try {
    const bearerToken = extractBearerToken(req);
    const { token, decoded, user } = await resolveToken(bearerToken);

    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: invalid token',
        code: 'TOKEN_INVALID',
      });
    }

    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message,
        code: err.code || 'UNAUTHORIZED',
      });
    }

    console.error('[auth.middleware] unexpected error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}

function requireApp(appName) {
  return (req, res, next) => {
    const apps = req.user?.apps || [];

    if (!apps.includes(appName)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: access to ${appName} is not allowed`,
        code: 'APP_FORBIDDEN',
      });
    }

    return next();
  };
}

function requireJobLevel(minLevel) {
  return (req, res, next) => {
    const userLevel = req.user?.job_level_value ?? 0;

    if (Number(userLevel) < Number(minLevel)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient job level',
        code: 'JOB_LEVEL_FORBIDDEN',
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireApp,
  requireJobLevel,
};