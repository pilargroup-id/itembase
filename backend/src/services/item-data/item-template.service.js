const ItemDataModel = require('../../models/item-data/item-data.model');
const { createWorkbookBuffer } = require('../../utils/xlsx.util');

const TEMPLATES = {
  parents: {
    filename: 'item-parent-import-template.xlsx',
    sheets: [{
      name: 'Parents',
      headers: ['Parent ID','Brand','Sub Brand','Item Name','Category Detail','Item Source','Ports Code','Variant Attribute','Status'],
      rows: [{
        'Parent ID': 'EXAMPLE_PARENT_ID',
        Brand: 'ASA',
        'Sub Brand': 'ASAHO',
        'Item Name': 'LUNCH BOX',
        'Category Detail': 'DINING EQUIPMENT',
        'Item Source': 'LOCAL',
        'Ports Code': 'CNAPP;CNAQG',
        'Variant Attribute': 'COLOR;MODEL',
        Status: 'Active',
      }],
    }],
  },
  items: {
    filename: 'regular-item-import-template.xlsx',
    sheets: [{
      name: 'Items',
      headers: ['SKU ID','SKU Name','Parent ID','UOM Code','Qty/Pack','Height','Width','Depth','Gross Weight/Pack','Lead Time','Variant Attribute Value','Status'],
      rows: [{
        'SKU ID': 'EXAMPLE_SKU_ID',
        'SKU Name': 'ASA ASAHO LUNCH BOX DARK BLUE',
        'Parent ID': 'P002034',
        'UOM Code': 'PCS',
        'Qty/Pack': 12,
        Height: 10,
        Width: 20,
        Depth: 5,
        'Gross Weight/Pack': 8.5,
        'Lead Time': 7,
        'Variant Attribute Value': 'COLOR=DARK_BLUE;MODEL=STANDARD',
        Status: 'Active',
      }],
    }],
  },
  bundles: {
    filename: 'bundle-import-template.xlsx',
    sheets: [
      {
        name: 'Bundles',
        headers: ['SKU ID','Selling Name','Parent ID','Status'],
        rows: [{
          'SKU ID': 'EXAMPLE_BUNDLE_SKU_ID',
          'Selling Name': 'BUNDLE SAMPLE',
          'Parent ID': 'P002034',
          Status: 'Active',
        }],
      },
      {
        name: 'Bundle Components',
        headers: ['SKU ID Bundle','SKU ID Component','Qty','Sort Order'],
        rows: [{
          'SKU ID Bundle': 'EXAMPLE_BUNDLE_SKU_ID',
          'SKU ID Component': '682600000001',
          Qty: 2,
          'Sort Order': 1,
        }],
      },
    ],
  },
};

function statusText(value) {
  return Number(value) ? 'Active' : 'Inactive';
}

async function generate(type) {
  const config = TEMPLATES[type];
  if (!config) throw Object.assign(new Error('Template type must be parents, items, or bundles'), { statusCode: 422 });

  const refs = await ItemDataModel.listReferences();
  const sheets = [
    ...config.sheets,
    { name: 'Ref Brands', headers: ['Code','Name','Status'], rows: refs.brands.map((r) => ({ Code: r.code, Name: r.name, Status: statusText(r.is_active) })) },
    { name: 'Ref Categories', headers: ['Category Detail','Sub Category','Main Category','Brand Category','Status'], rows: refs.categories.map((r) => ({ 'Category Detail': r.detail_category, 'Sub Category': r.sub_category, 'Main Category': r.main_category, 'Brand Category': r.brand_category, Status: statusText(r.is_active) })) },
    { name: 'Ref Item Sources', headers: ['Code','Name','Status'], rows: refs.itemTypes.map((r) => ({ Code: r.code, Name: r.name, Status: statusText(r.is_active) })) },
    { name: 'Ref UOMs', headers: ['Code','Name','Status'], rows: refs.uoms.map((r) => ({ Code: r.code, Name: r.name, Status: statusText(r.is_active) })) },
    { name: 'Ref Ports', headers: ['Port Code','Country Code','Port Name','Status'], rows: refs.ports.map((r) => ({ 'Port Code': r.code, 'Country Code': r.country_code, 'Port Name': r.name, Status: statusText(r.is_active) })) },
    { name: 'Ref Variant Attributes', headers: ['Attribute Code','Attribute Name','Status'], rows: refs.attributes.map((r) => ({ 'Attribute Code': r.code, 'Attribute Name': r.name, Status: statusText(r.is_active) })) },
    { name: 'Ref Variant Values', headers: ['Attribute Code','Value Code','Value Name','Status'], rows: refs.values.map((r) => ({ 'Attribute Code': r.attribute_code, 'Value Code': r.value_code, 'Value Name': r.value_name, Status: statusText(r.is_active) })) },
    { name: 'Ref Parents', headers: ['Parent ID','Parent Name','Status'], rows: refs.parents.map((r) => ({ 'Parent ID': r.parent_code, 'Parent Name': r.parent_name, Status: r.status })) },
    { name: 'Ref Items', headers: ['SKU ID','SKU Name','SKU Type','Status'], rows: refs.items.map((r) => ({ 'SKU ID': r.item_code, 'SKU Name': r.item_name, 'SKU Type': r.item_kind === 'bundle' ? 'Bundle' : 'Regular', Status: statusText(r.is_active) })) },
    { name: 'Instructions', headers: ['Rule'], rows: [
      { Rule: 'The EXAMPLE row is ignored by import. Replace or remove it before uploading real data.' },
      { Rule: 'Blank cell on UPDATE means keep existing value.' },
      { Rule: 'Use NULL to clear an optional field.' },
      { Rule: 'Multiple values use semicolon (;).' },
      { Rule: 'Variant Attribute Value uses ATTRIBUTE=VALUE;ATTRIBUTE=VALUE.' },
      { Rule: 'Bundle UOM is assigned automatically to UOM code SET.' },
      { Rule: 'Preview does not change database data.' },
    ] },
  ];

  return { filename: config.filename, buffer: await createWorkbookBuffer(sheets) };
}

module.exports = { generate, TEMPLATES };
