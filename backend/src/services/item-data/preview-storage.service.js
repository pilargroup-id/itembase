const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.resolve(__dirname, '../../storage/import-previews');
const TTL_MS = 60 * 60 * 1000;

async function ensureDir() { await fs.mkdir(STORAGE_DIR, { recursive: true }); }
function filePath(token) { return path.join(STORAGE_DIR, `${token}.json`); }

async function save(payload) {
  await ensureDir();
  const token = crypto.randomUUID();
  const createdAt = Date.now();
  const record = { ...payload, token, created_at: new Date(createdAt).toISOString(), expires_at: new Date(createdAt + TTL_MS).toISOString() };
  await fs.writeFile(filePath(token), JSON.stringify(record), 'utf8');
  return record;
}

async function get(token) {
  await ensureDir();
  let record;
  try { record = JSON.parse(await fs.readFile(filePath(token), 'utf8')); }
  catch { return null; }
  if (Date.parse(record.expires_at) <= Date.now()) { await remove(token); return null; }
  return record;
}

async function remove(token) {
  try { await fs.unlink(filePath(token)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function cleanupExpired() {
  await ensureDir();
  const files = await fs.readdir(STORAGE_DIR);
  await Promise.all(files.filter((name) => name.endsWith('.json')).map(async (name) => {
    try {
      const full = path.join(STORAGE_DIR, name);
      const record = JSON.parse(await fs.readFile(full, 'utf8'));
      if (Date.parse(record.expires_at) <= Date.now()) await fs.unlink(full);
    } catch { /* ignore invalid temp files */ }
  }));
}

module.exports = { save, get, remove, cleanupExpired, TTL_MS };
