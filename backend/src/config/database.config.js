const mysql = require('mysql2/promise');
const config = require('./index');

const db = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
});

async function testConnection() {
  try {
    const conn = await db.getConnection();
    console.log(`[db] connected to ${config.app.slug}: ${config.db.name}@${config.db.host}`);
    conn.release();
  } catch (error) {
    console.error(`[db] ${config.app.slug} connection failed: ${config.db.name}@${config.db.host}`);
    console.error(`[db] error: ${error.message}`);
    process.exit(1);
  }
}

testConnection();

module.exports = { db };
