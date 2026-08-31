const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { BigQuery } = require('@google-cloud/bigquery');
const config = require('../../config');

const bigquery = new BigQuery({
  projectId: config.bigquery.projectId,
});

const dataset = bigquery.dataset(config.bigquery.dataset);

function fullTableName(tableName) {
  return `${config.bigquery.projectId}.${config.bigquery.dataset}.${tableName}`;
}

async function ensureTablesExist(tableNames) {
  const missing = [];

  for (const tableName of tableNames) {
    const [exists] = await dataset.table(tableName).exists();
    if (!exists) missing.push(tableName);
  }

  if (missing.length) {
    throw new Error(`BigQuery table(s) not found: ${missing.join(', ')}`);
  }
}

async function truncateTable(tableName) {
  await bigquery.query({
    query: `TRUNCATE TABLE \`${fullTableName(tableName)}\``,
    location: config.bigquery.location,
  });
}

async function replaceTableRows(tableName, rows, fields) {
  if (!Array.isArray(rows)) {
    throw new TypeError(`Rows for ${tableName} must be an array`);
  }

  if (!rows.length) {
    await truncateTable(tableName);
    return 0;
  }

  const tempFile = path.join(
    os.tmpdir(),
    `itembase-bq-${tableName}-${process.pid}-${randomUUID()}.jsonl`
  );

  const body = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
  await fs.promises.writeFile(tempFile, body, 'utf8');

  try {
    const [job] = await dataset.table(tableName).load(tempFile, {
      location: config.bigquery.location,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_TRUNCATE',
      createDisposition: 'CREATE_NEVER',
      schema: {
        fields,
      },
      ignoreUnknownValues: false,
      maxBadRecords: 0,
    });

    const [metadata] = await job.getMetadata();
    const errors = metadata.status && metadata.status.errors;

    if (Array.isArray(errors) && errors.length) {
      throw new Error(
        `BigQuery load failed for ${tableName}: ${errors
          .map((error) => error.message)
          .join('; ')}`
      );
    }

    return rows.length;
  } finally {
    await fs.promises.rm(tempFile, { force: true });
  }
}

module.exports = {
  ensureTablesExist,
  replaceTableRows,
};
