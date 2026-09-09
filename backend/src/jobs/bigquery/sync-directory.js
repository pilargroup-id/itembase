const UserModel = require('../../models/directory/user.model');
const BusinessUnitModel = require('../../models/directory/business-unit.model');
const { replaceTableRows } = require('./bigquery.client');
const { directoryMappings, normalizeRow } = require('./table-mappings');

async function syncProductUsers(syncedAt) {
  const mapping = directoryMappings.productUsers;

  // The existing /api/directory/users/product route does not require active=1,
  // so keep all Product department users in the BigQuery dimension.
  const sourceRows = await UserModel.findProductUsers();
  const rows = sourceRows.map((row) =>
    normalizeRow(row, mapping.fields, syncedAt)
  );

  const count = await replaceTableRows(mapping.targetTable, rows, mapping.fields);

  console.log(
    `[bigquery][directory] product users -> ${mapping.targetTable}: ${count} rows`
  );

  return {
    source: 'directory:product-users',
    target: mapping.targetTable,
    rows: count,
  };
}

async function syncBusinessUnits(syncedAt) {
  const unitMapping = directoryMappings.businessUnits;
  const departmentMapping = directoryMappings.businessUnitDepartments;

  // Match the active=1 directory flow used by Itembase for Business Units.
  const businessUnits = await BusinessUnitModel.findAll({ active: 1 });

  const unitRows = businessUnits.map((row) =>
    normalizeRow(row, unitMapping.fields, syncedAt)
  );

  const unitCount = await replaceTableRows(
    unitMapping.targetTable,
    unitRows,
    unitMapping.fields
  );

  console.log(
    `[bigquery][directory] business units -> ${unitMapping.targetTable}: ${unitCount} rows`
  );

  const departments = [];

  for (const businessUnit of businessUnits) {
    const rows = await BusinessUnitModel.findDepartmentsByBusinessUnitId(
      businessUnit.id,
      { active: 1 }
    );

    departments.push(...rows);
  }

  const departmentRows = departments.map((row) =>
    normalizeRow(row, departmentMapping.fields, syncedAt)
  );

  const departmentCount = await replaceTableRows(
    departmentMapping.targetTable,
    departmentRows,
    departmentMapping.fields
  );

  console.log(
    `[bigquery][directory] business unit departments -> ${departmentMapping.targetTable}: ${departmentCount} rows`
  );

  return [
    {
      source: 'directory:business-units',
      target: unitMapping.targetTable,
      rows: unitCount,
    },
    {
      source: 'directory:business-unit-departments',
      target: departmentMapping.targetTable,
      rows: departmentCount,
    },
  ];
}

async function syncDirectory(syncedAt) {
  const productUsers = await syncProductUsers(syncedAt);
  const businessUnits = await syncBusinessUnits(syncedAt);

  return [productUsers, ...businessUnits];
}

module.exports = {
  syncDirectory,
};
