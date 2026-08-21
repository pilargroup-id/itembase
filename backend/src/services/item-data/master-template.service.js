const { createWorkbookBuffer } = require('../../utils/xlsx.util');
const { DEFINITIONS } = require('./master-export.service');

const EXAMPLES = {
  brands: { Code: 'EXAMPLE_BRAND', Name: 'EXAMPLE BRAND', Status: 'Active' },
  categories: { Category: 'EXAMPLE CATEGORY', 'Sub Category': 'EXAMPLE SUB CATEGORY', 'Main Category': 'EXAMPLE MAIN CATEGORY', 'Brand Category': 'EXAMPLE BRAND CATEGORY', Status: 'Active' },
  'item-sources': { 'Item Source Code': 'EXAMPLE_SOURCE', 'Item Source Name': 'EXAMPLE SOURCE', Status: 'Active' },
  ports: { 'Country Code': 'CN', 'Port Code': 'CNEXM', 'Port Name': 'EXAMPLE PORT', Status: 'Active' },
  uoms: { 'UOM Code': 'EXAMPLE_UOM', 'UOM Name': 'EXAMPLE UOM', Status: 'Active' },
  'variant-attributes': { 'Attribute Code': 'EXAMPLE_ATTRIBUTE', 'Attribute Name': 'EXAMPLE ATTRIBUTE', Status: 'Active' },
  'variant-values': { 'Attribute Code': 'COLOR', 'Value Code': 'EXAMPLE_VALUE', 'Value Name': 'EXAMPLE VALUE', Status: 'Active' },
  'sub-brands': { 'Sub Brand': 'EXAMPLE SUB BRAND', Status: 'Active' },
};

async function generate(type) {
  const definition = DEFINITIONS[type];
  if (!definition) throw Object.assign(new Error('Unsupported master template type'), { statusCode: 422 });
  return {
    filename: `${definition.filename}-import-template.xlsx`,
    buffer: await createWorkbookBuffer([
      { name: definition.sheet, headers: definition.headers, rows: [EXAMPLES[type]] },
      { name: 'Instructions', headers: ['Rule'], rows: [
        { Rule: 'The EXAMPLE row is ignored by import. Replace or remove it before uploading real data.' },
        { Rule: 'Blank cell on UPDATE means keep existing value.' },
        { Rule: 'Status accepts Active or Inactive.' },
        { Rule: 'Import uses preview first. Preview does not change database data.' },
      ] },
    ]),
  };
}

module.exports = { generate, EXAMPLES };
