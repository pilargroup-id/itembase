const ExportModel=require('../../models/item-data/item-export.model');
const {createWorkbookBuffer}=require('../../utils/xlsx.util');

function dateText(value){if(!value)return'';const d=value instanceof Date?value:new Date(value);return Number.isNaN(d.getTime())?String(value):d.toISOString().replace('T',' ').slice(0,19);}
function normalizeDates(rows){return rows.map((row)=>({...row,created_at:dateText(row.created_at),updated_at:dateText(row.updated_at)}));}

async function exportType(type){
  if(type==='parents'){
    const rows=normalizeDates(await ExportModel.parents());
    const headers=['parent_code','brand_code','subbrand_name','item_name','category_detail','item_type_code','parent_name','status','ports','variant_attributes','created_at','updated_at'];
    return{filename:'item-parents.xlsx',buffer:await createWorkbookBuffer([{name:'Parents',headers,rows}])};
  }
  if(type==='items'){
    const rows=normalizeDates(await ExportModel.items('regular'));
    const headers=['item_code','barcode','item_name','selling_name','parent_code','uom_code','qty_per_pack','height','width','depth','gross_weight_pack','production_time_days','is_active','variants','created_at','updated_at'];
    return{filename:'regular-items.xlsx',buffer:await createWorkbookBuffer([{name:'Items',headers,rows}])};
  }
  if(type==='bundles'){
    const bundles=normalizeDates(await ExportModel.items('bundle'));
    const components=await ExportModel.bundleComponents();
    return{filename:'bundles.xlsx',buffer:await createWorkbookBuffer([
      {name:'Bundles',headers:['item_code','barcode','item_name','selling_name','parent_code','uom_code','is_active','created_at','updated_at'],rows:bundles},
      {name:'Bundle Components',headers:['bundle_item_code','component_item_code','qty','sort_order'],rows:components},
    ])};
  }
  throw Object.assign(new Error('Export type must be parents, items, or bundles'),{statusCode:422});
}
module.exports={exportType};
