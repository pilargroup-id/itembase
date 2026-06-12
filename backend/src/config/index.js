const path = require('path');
const fs   = require('fs');

const localEnv = path.resolve(process.cwd(), '.env.local');
const baseEnv  = path.resolve(process.cwd(), '.env');

if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
} else if (fs.existsSync(baseEnv)) {
  require('dotenv').config({ path: baseEnv });
} else {
  require('dotenv').config();
}

const config = {
  app: {
    name : process.env.APP_NAME || 'itembase',
    port : parseInt(process.env.APP_PORT, 10) || 3000,
    env  : process.env.NODE_ENV || 'production',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  pilargroup: {
    url: process.env.PILARGROUP_URL || 'https://pilargroup.id',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  db: {
    host     : process.env.DB_HOST     || '127.0.0.1',
    port     : parseInt(process.env.DB_PORT, 10) || 3306,
    user     : process.env.DB_USER     || 'root',
    password : process.env.DB_PASSWORD || '',
    name     : process.env.DB_NAME     || 'itembase',
  },
  centralDb: {
    host     : process.env.CENTRAL_DB_HOST     || '127.0.0.1',
    port     : parseInt(process.env.CENTRAL_DB_PORT, 10) || 3306,
    user     : process.env.CENTRAL_DB_USER     || 'root',
    password : process.env.CENTRAL_DB_PASSWORD || '',
    name     : process.env.CENTRAL_DB_NAME     || 'pilargroup',
  },
  dev: {
    authEnabled  : process.env.DEV_AUTH_ENABLED === 'true',
    authUsername : process.env.DEV_AUTH_USERNAME,
    authPassword : process.env.DEV_AUTH_PASSWORD,
  },
};

if (!config.jwt.secret) {
  console.error('[config] JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

module.exports = config;
