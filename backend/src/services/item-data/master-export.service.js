const Model = require('../../models/item-data/master-data.model');
const { createWorkbookBuffer } = require('../../utils/xlsx.util');

const DEFINITIONS = {
  brands: { filename: 'master-brands', sheet: 'Brands', headers: ['Code','Name','Status'], map: (r) => ({ Code:r.code, Name:r.name, Status:Number(r.is_active)?'Active':'Inactive' }) },
  categories: { filename: 'master-categories', sheet: 'Categories', headers: ['Category','Sub Category','Main Category','Brand Category','Status'], map: (r) => ({ Category:r.detail_category, 'Sub Category':r.sub_category, 'Main Category':r.main_category, 'Brand Category':r.brand_category, Status:Number(r.is_active)?'Active':'Inactive' }) },
  'item-sources': { filename: 'master-item-sources', sheet: 'Item Sources', headers: ['Item Source Code','Item Source Name','Status'], map: (r) => ({ 'Item Source Code':r.code, 'Item Source Name':r.name, Status:Number(r.is_active)?'Active':'Inactive' }) },
  ports: { filename: 'master-ports', sheet: 'Ports', headers: ['Country Code','Port Code','Port Name','Status'], map: (r) => ({ 'Country Code':r.country_code, 'Port Code':r.code, 'Port Name':r.name, Status:Number(r.is_active)?'Active':'Inactive' }) },
  uoms: { filename: 'master-uoms', sheet: 'UOMs', headers: ['UOM Code','UOM Name','Status'], map: (r) => ({ 'UOM Code':r.code, 'UOM Name':r.name, Status:Number(r.is_active)?'Active':'Inactive' }) },
  'variant-attributes': { filename: 'master-variant-attributes', sheet: 'Variant Attributes', headers: ['Attribute Code','Attribute Name','Status'], map: (r) => ({ 'Attribute Code':r.code, 'Attribute Name':r.name, Status:Number(r.is_active)?'Active':'Inactive' }) },
  'variant-values': { filename: 'master-variant-values', sheet: 'Variant Values', headers: ['Attribute Code','Value Code','Value Name','Status'], map: (r) => ({ 'Attribute Code':r.attribute_code, 'Value Code':r.value_code, 'Value Name':r.value_name, Status:Number(r.is_active)?'Active':'Inactive' }) },
  'sub-brands': { filename: 'master-sub-brands', sheet: 'Sub Brands', headers: ['Sub Brand','Status'], map: (r) => ({ 'Sub Brand':r.name, Status:Number(r.is_active)?'Active':'Inactive' }) },
};

function normalizeStatus(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const status = String(value).trim().toLowerCase();
  if (!['active','inactive'].includes(status)) throw Object.assign(new Error('Status must be active or inactive'), { statusCode: 422 });
  return status;
}

async function exportMaster(type, query = {}) {
  const definition = DEFINITIONS[type];
  if (!definition) throw Object.assign(new Error('Unsupported master export type'), { statusCode: 422 });
  const status = normalizeStatus(query.status);
  const rows = await Model.exportRows(type, status);
  return {
    filename: `${definition.filename}-${status || 'all'}.xlsx`,
    buffer: await createWorkbookBuffer([{ name: definition.sheet, headers: definition.headers, rows: rows.map(definition.map) }]),
  };
}

module.exports = { exportMaster, DEFINITIONS };
