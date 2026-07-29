const ItemDataModel = require('../../models/item-data/item-data.model');
const { createWorkbookBuffer } = require('../../utils/xlsx.util');

const TEMPLATES = {
  parents: {
    filename: 'item-parent-import-template.xlsx',
    sheets: [{ name: 'Parents', headers: ['parent_code','brand_code','subbrand_name','item_name','category_detail','item_type_code','parent_name','status','ports','variant_attributes'] }],
  },
  items: {
    filename: 'regular-item-import-template.xlsx',
    sheets: [{ name: 'Items', headers: ['item_code','item_name','selling_name','parent_code','uom_code','qty_per_pack','height','width','depth','gross_weight_pack','production_time_days','is_active','variants'] }],
  },
  bundles: {
    filename: 'bundle-import-template.xlsx',
    sheets: [
      { name: 'Bundles', headers: ['item_code','selling_name','parent_code','uom_code','is_active'] },
      { name: 'Bundle Components', headers: ['bundle_item_code','component_item_code','qty','sort_order'] },
    ],
  },
};

async function generate(type) {
  const config = TEMPLATES[type];
  if (!config) throw Object.assign(new Error('Template type must be parents, items, or bundles'), { statusCode: 422 });
  const refs = await ItemDataModel.listReferences();
  const sheets = [...config.sheets,
    { name: 'Ref Brands', headers: ['code','name','is_active'], rows: refs.brands },
    { name: 'Ref Categories', headers: ['detail_category','sub_category','main_category','brand_category','is_active'], rows: refs.categories },
    { name: 'Ref Item Types', headers: ['code','name','is_active'], rows: refs.itemTypes },
    { name: 'Ref UOMs', headers: ['code','name','is_active'], rows: refs.uoms },
    { name: 'Ref Ports', headers: ['code','country_code','name','is_active'], rows: refs.ports },
    { name: 'Ref Variant Attributes', headers: ['code','name','is_active'], rows: refs.attributes },
    { name: 'Ref Variant Values', headers: ['attribute_code','value_code','value_name','is_active'], rows: refs.values },
    { name: 'Ref Parents', headers: ['parent_code','parent_name','status'], rows: refs.parents },
    { name: 'Ref Items', headers: ['item_code','item_name','item_kind','is_active'], rows: refs.items },
    { name: 'Instructions', headers: ['rule'], rows: [
      { rule: 'Blank cell on UPDATE means keep existing value.' },
      { rule: 'Use NULL to clear an optional field.' },
      { rule: 'Multiple values use semicolon (;).' },
      { rule: 'Variants use ATTRIBUTE=VALUE;ATTRIBUTE=VALUE.' },
      { rule: 'Preview does not change database data.' },
    ] },
  ];
  return { filename: config.filename, buffer: await createWorkbookBuffer(sheets) };
}

module.exports = { generate, TEMPLATES };
