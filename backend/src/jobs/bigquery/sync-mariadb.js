const { db } = require('../../config/database.config');
const { replaceTableRows } = require('./bigquery.client');
const {
  mariadbMappings,
  buildMariaDbSelect,
  normalizeRow,
} = require('./table-mappings');

async function syncMariaDb(syncedAt) {
  const summary = [];

  for (const mapping of mariadbMappings) {
    const sql = buildMariaDbSelect(mapping);
    const [sourceRows] = await db.query(sql);

    const rows = sourceRows.map((row) =>
      normalizeRow(row, mapping.fields, syncedAt)
    );

    const count = await replaceTableRows(
      mapping.targetTable,
      rows,
      mapping.fields
    );

    console.log(
      `[bigquery][mariadb] ${mapping.sourceTable} -> ${mapping.targetTable}: ${count} rows`
    );

    summary.push({
      source: mapping.sourceTable,
      target: mapping.targetTable,
      rows: count,
    });
  }

  return summary;
}

module.exports = {
  syncMariaDb,
};
