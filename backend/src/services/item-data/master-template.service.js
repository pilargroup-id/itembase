const { createWorkbookBuffer } = require('../../utils/xlsx.util');
const DirectoryService = require('../pilargroup-directory.service');
const { DEFINITIONS } = require('./master-export.service');

const PRODUCT_DEPARTMENT_ID = 13;

const IMPORT_HEADERS = {
  brands: ['Name', 'Business Unit Code', 'Channel Code', 'Status'],
  categories: ['Category', 'Sub Category', 'Main Category', 'Brand Category', 'PIC', 'Status'],
  'item-sources': ['Item Source Name', 'Status'],
  ports: ['Country Code', 'Port Code', 'Port Name', 'Status'],
  uoms: ['UOM Name', 'Status'],
  'variant-attributes': ['Attribute Name', 'Status'],
  'variant-values': ['Attribute Code', 'Value Name', 'Sort Order', 'Status'],
  'sub-brands': ['Sub Brand', 'Status'],
};

const EXAMPLES = {
  brands: {
    Name: 'EXAMPLE BRAND',
    'Business Unit Code': 'EXAMPLE_BU',
    'Channel Code': 'EXAMPLE_CHANNEL',
    Status: 'Active',
  },
  categories: {
    Category: 'EXAMPLE CATEGORY',
    'Sub Category': 'EXAMPLE SUB CATEGORY',
    'Main Category': 'EXAMPLE MAIN CATEGORY',
    'Brand Category': 'EXAMPLE BRAND CATEGORY',
    PIC: 'EXAMPLE_USER',
    Status: 'Active',
  },
  'item-sources': { 'Item Source Name': 'EXAMPLE SOURCE', Status: 'Active' },
  ports: { 'Country Code': 'CN', 'Port Code': 'CNEXM', 'Port Name': 'EXAMPLE PORT', Status: 'Active' },
  uoms: { 'UOM Name': 'EXAMPLE UOM', Status: 'Active' },
  'variant-attributes': { 'Attribute Name': 'EXAMPLE ATTRIBUTE', Status: 'Active' },
  'variant-values': { 'Attribute Code': 'COLOR', 'Value Name': 'EXAMPLE VALUE', 'Sort Order': 1, Status: 'Active' },
  'sub-brands': { 'Sub Brand': 'EXAMPLE SUB BRAND', Status: 'Active' },
};

function activeRows(rows = []) {
  return rows.filter((row) => Number(row.is_active) === 1);
}

async function productUserHelper() {
  const users = await DirectoryService.getUsers();
  return activeRows(users)
    .filter((user) => Number(user.department_id) === PRODUCT_DEPARTMENT_ID)
    .sort((a, b) => String(a.name || a.username).localeCompare(String(b.name || b.username)))
    .map((user) => ({
      Username: user.username || '',
      Name: user.name || '',
      Email: user.email || '',
    }));
}

async function brandChannelHelper() {
  const businessUnits = activeRows(await DirectoryService.getBusinessUnits())
    .sort((a, b) => String(a.name || a.code).localeCompare(String(b.name || b.code)));

  const rows = [];
  for (const businessUnit of businessUnits) {
    const departments = activeRows(await DirectoryService.getBusinessUnitDepartments(businessUnit.id));
    departments
      .sort((a, b) => {
        const primaryDiff = Number(b.is_primary || 0) - Number(a.is_primary || 0);
        if (primaryDiff !== 0) return primaryDiff;
        return String(a.department_name || a.department_code).localeCompare(String(b.department_name || b.department_code));
      })
      .forEach((department) => {
        rows.push({
          'Business Unit Code': businessUnit.code || '',
          'Business Unit Name': businessUnit.name || '',
          'Channel Code': department.department_code || '',
          'Channel Name': department.department_name || '',
        });
      });
  }

  return rows;
}

async function generate(type) {
  const definition = DEFINITIONS[type];
  const headers = IMPORT_HEADERS[type];
  if (!definition || !headers) {
    throw Object.assign(new Error('Unsupported master template type'), { statusCode: 422 });
  }

  const sheets = [
    { name: definition.sheet, headers, rows: [EXAMPLES[type]] },
  ];

  if (type === 'categories') {
    sheets.push({
      name: 'Ref PIC Users',
      headers: ['Username', 'Name', 'Email'],
      rows: await productUserHelper(),
    });
  }

  if (type === 'brands') {
    sheets.push({
      name: 'Ref Brand Channels',
      headers: ['Business Unit Code', 'Business Unit Name', 'Channel Code', 'Channel Name'],
      rows: await brandChannelHelper(),
    });
  }

  sheets.push({
    name: 'Instructions',
    headers: ['Rule'],
    rows: [
      { Rule: 'The EXAMPLE row is ignored by import. Replace or remove it before uploading real data.' },
      { Rule: 'Blank cell on UPDATE means keep existing value.' },
      { Rule: 'Status accepts Active or Inactive.' },
      { Rule: 'Multiple PIC usernames use semicolon (;), for example azi;andi. The first username becomes primary.' },
      { Rule: 'For Brand, Business Unit Code and Channel Code support semicolon-separated pairs in the same order.' },
      { Rule: 'Brand, Item Source, UOM, Variant Attribute, and Variant Value codes are generated automatically from Name.' },
      { Rule: 'Import uses preview first. Preview does not change database data.' },
    ],
  });

  return {
    filename: `${definition.filename}-import-template.xlsx`,
    buffer: await createWorkbookBuffer(sheets),
  };
}

module.exports = { generate, EXAMPLES, IMPORT_HEADERS };
