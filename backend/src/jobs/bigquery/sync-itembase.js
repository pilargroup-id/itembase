const config = require('../../config');
const { db } = require('../../config/database.config');
const { ensureTablesExist } = require('./bigquery.client');
const { allTargetTableNames } = require('./table-mappings');
const { syncMariaDb } = require('./sync-mariadb');
const { syncDirectory } = require('./sync-directory');

function totalRows(summary) {
  return summary.reduce((total, item) => total + Number(item.rows || 0), 0);
}

async function run() {
  const startedAt = new Date();
  const syncedAt = startedAt.toISOString();

  console.log('============================================================');
  console.log('[bigquery] Itembase snapshot sync started');
  console.log(`[bigquery] project : ${config.bigquery.projectId}`);
  console.log(`[bigquery] dataset : ${config.bigquery.dataset}`);
  console.log(`[bigquery] location: ${config.bigquery.location}`);
  console.log(`[bigquery] syncedAt: ${syncedAt}`);
  console.log('============================================================');

  await ensureTablesExist(allTargetTableNames());
  console.log('[bigquery] target table validation passed');

  const mariadbSummary = await syncMariaDb(syncedAt);
  const directorySummary = await syncDirectory(syncedAt);

  const finishedAt = new Date();
  const durationSeconds = ((finishedAt - startedAt) / 1000).toFixed(2);

  console.log('============================================================');
  console.log('[bigquery] Itembase snapshot sync completed');
  console.log(`[bigquery] MariaDB rows : ${totalRows(mariadbSummary)}`);
  console.log(`[bigquery] Directory rows: ${totalRows(directorySummary)}`);
  console.log(`[bigquery] Duration      : ${durationSeconds}s`);
  console.log('============================================================');
}

run()
  .catch((error) => {
    console.error('============================================================');
    console.error('[bigquery] Itembase snapshot sync FAILED');
    console.error(`[bigquery] ${error.stack || error.message}`);
    console.error('============================================================');
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.end();
    } catch (error) {
      console.error(`[bigquery] failed to close MariaDB pool: ${error.message}`);
      process.exitCode = 1;
    }
  });
