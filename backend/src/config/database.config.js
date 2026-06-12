const mysql  = require('mysql2/promise');
const config = require('./index');

const db = mysql.createPool({
  host               : config.db.host,
  port               : config.db.port,
  user               : config.db.user,
  password           : config.db.password,
  database           : config.db.name,
  waitForConnections : true,
  connectionLimit    : 10,
  queueLimit         : 0,
  timezone           : '+07:00',
});

const centralDb = mysql.createPool({
  host               : config.centralDb.host,
  port               : config.centralDb.port,
  user               : config.centralDb.user,
  password           : config.centralDb.password,
  database           : config.centralDb.name,
  waitForConnections : true,
  connectionLimit    : 10,
  queueLimit         : 0,
  timezone           : '+07:00',
});

async function testConnection(pool, label, dbName, host) {
  try {
    const conn = await pool.getConnection();
    console.log(`[db] connected to ${label}: ${dbName}@${host}`);
    conn.release();
  } catch (err) {
    console.error(`[db] ${label} connection failed: ${dbName}@${host}`);
    console.error(`[db] error: ${err.message}`);
    process.exit(1);
  }
}

testConnection(db, 'itembase', config.db.name, config.db.host);
testConnection(centralDb, 'central', config.centralDb.name, config.centralDb.host);

module.exports = { db, centralDb };