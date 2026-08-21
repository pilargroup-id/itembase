const Model = require('../../models/item-data/master-data.model');
const PreviewStorage = require('./preview-storage.service');
const { readWorkbook, worksheetToObjects, createWorkbookBuffer } = require('../../utils/xlsx.util');
const { DEFINITIONS } = require('./master-export.service');

const SPECS = {
  brands: { sheet:'Brands', pivot:['Code'], map:{Code:'code',Name:'name',Status:'is_active'}, required:['code','name'] },
  categories: { sheet:'Categories', pivot:['Category'], map:{Category:'detail_category','Sub Category':'sub_category','Main Category':'main_category','Brand Category':'brand_category',Status:'is_active'}, required:['detail_category','sub_category','main_category','brand_category'] },
  'item-sources': { sheet:'Item Sources', pivot:['Item Source Code'], map:{'Item Source Code':'code','Item Source Name':'name',Status:'is_active'}, required:['code','name'] },
  ports: { sheet:'Ports', pivot:['Port Code'], map:{'Country Code':'country_code','Port Code':'code','Port Name':'name',Status:'is_active'}, required:['country_code','code','name'] },
  uoms: { sheet:'UOMs', pivot:['UOM Code'], map:{'UOM Code':'code','UOM Name':'name',Status:'is_active'}, required:['code','name'] },
  'variant-attributes': { sheet:'Variant Attributes', pivot:['Attribute Code'], map:{'Attribute Code':'code','Attribute Name':'name',Status:'is_active'}, required:['code','name'] },
  'variant-values': { sheet:'Variant Values', pivot:['Attribute Code','Value Code'], map:{'Attribute Code':'attribute_code','Value Code':'value_code','Value Name':'value_name',Status:'is_active'}, required:['attribute_code','value_code','value_name'] },
  'sub-brands': { sheet:'Sub Brands', pivot:['Sub Brand'], map:{'Sub Brand':'name',Status:'is_active'}, required:['name'] },
};

function text(v){return v===undefined||v===null?'':String(v).trim();}
function error(message,code='VALIDATION_ERROR'){return{code,message};}
function statusValue(v){const s=text(v).toLowerCase();if(['active','1','true','yes'].includes(s))return 1;if(['inactive','0','false','no'].includes(s))return 0;return null;}
function remap(row,map){const out={_source_row:row._source_row};Object.entries(map).forEach(([h,k])=>{if(Object.prototype.hasOwnProperty.call(row,h))out[k]=row[h];});return out;}
function isExample(row){return Object.values(row).some((v)=>/^EXAMPLE_/i.test(text(v))||/^EXAMPLE /i.test(text(v)));}
function originalForHeaders(row,spec){const out={};Object.entries(spec.map).forEach(([h,k])=>{out[h]=row?.[k]??'';});return out;}

async function validateRow(type,row){
  const spec=SPECS[type];const errors=[];
  let existing;
  if(type==='variant-values') existing=await Model.findByPivot(type,text(row.attribute_code),text(row.value_code));
  else existing=await Model.findByPivot(type,text(row[spec.map[spec.pivot[0]]]));
  const action=existing?'UPDATE':'CREATE';
  const fields={};

  for(const field of Object.values(spec.map)){
    if(field==='is_active')continue;
    if(text(row[field])!=='')fields[field]=text(row[field]);
  }
  if(!existing){for(const field of spec.required){if(!text(row[field]))errors.push(error(`${field} is required for create`,'REQUIRED_FIELD'));}}
  if(text(row.is_active)!==''){
    const v=statusValue(row.is_active);if(v===null)errors.push(error('Status must be Active or Inactive'));else fields.is_active=v;
  }else if(!existing)fields.is_active=1;

  if(type==='ports'&&fields.country_code){fields.country_code=fields.country_code.toUpperCase();if(!/^[A-Z]{2}$/.test(fields.country_code))errors.push(error('Country Code must contain exactly 2 letters'));if(fields.code&&!fields.code.toUpperCase().startsWith(fields.country_code))errors.push(error('Port Code must start with Country Code'));}
  if(['brands','item-sources','uoms','variant-attributes'].includes(type)&&fields.code)fields.code=fields.code.toUpperCase();
  if(type==='variant-values'){
    if(fields.attribute_code)fields.attribute_code=fields.attribute_code.toUpperCase();
    if(fields.value_code)fields.value_code=fields.value_code.toUpperCase();
    if(fields.value_name)fields.value_name=fields.value_name.toUpperCase();
    const attr=fields.attribute_code?await Model.findVariantAttributeByCode(fields.attribute_code):null;
    if(fields.attribute_code&&(!attr||!Number(attr.is_active)))errors.push(error(`Variant Attribute ${fields.attribute_code} not found or inactive`,'REFERENCE_NOT_FOUND'));
    if(attr)fields.attribute_id=attr.id;
  }
  if(type==='sub-brands'&&fields.name)fields.normalized_name=fields.name.toLowerCase();
  if(existing&&!Object.keys(fields).length)errors.push(error('No fields supplied for update','NO_CHANGES'));
  return{source_row:row._source_row,action,status:errors.length?'INVALID':'VALID',errors,original:row,normalized:{existing_id:existing?.id||null,fields}};
}

async function preview(type,buffer,userId){
  const spec=SPECS[type];if(!spec)throw Object.assign(new Error('Unsupported master import type'),{statusCode:422});
  await PreviewStorage.cleanupExpired();
  const workbook=await readWorkbook(buffer);const rows=worksheetToObjects(workbook.getWorksheet(spec.sheet)).map((r)=>remap(r,spec.map)).filter((r)=>!isExample(r));
  const results=[];for(const row of rows)results.push(await validateRow(type,row));
  const seen=new Set();const dup=new Set();results.forEach((r)=>{const f=r.normalized.fields;const key=type==='variant-values'?`${text(f.attribute_code||r.original.attribute_code)}|${text(f.value_code||r.original.value_code)}`:text(f[Object.values(spec.map)[0]]||r.original[Object.values(spec.map)[0]]);if(seen.has(key))dup.add(key);seen.add(key);r._key=key;});
  results.forEach((r)=>{if(dup.has(r._key)){r.errors.push(error('Duplicate pivot value in uploaded file','DUPLICATE_FILE_CODE'));r.status='INVALID';}delete r._key;});
  const record=await PreviewStorage.save({type:`master:${type}`,user_id:userId,rows:results});
  return{preview_token:record.token,expires_at:record.expires_at,summary:{total:results.length,valid:results.filter(r=>r.status==='VALID').length,invalid:results.filter(r=>r.status==='INVALID').length},rows:results.map(({normalized,...r})=>r)};
}

async function apply(type,normalized){
  return Model.transaction(async(connection)=>{
    const fields={...normalized.fields};
    if(type==='variant-values'){
      const existing=await Model.findByPivot(type,fields.attribute_code,fields.value_code,connection);delete fields.attribute_code;
      if(existing)await Model.update(type,existing.id,fields,connection);else await Model.create(type,fields,connection);return;
    }
    const spec=SPECS[type];const pivotField=spec.map[spec.pivot[0]];const existing=await Model.findByPivot(type,fields[pivotField],null,connection);
    if(existing)await Model.update(type,existing.id,fields,connection);else await Model.create(type,fields,connection);
  });
}

async function commit(token,userId){
  const record=await PreviewStorage.get(token);if(!record)throw Object.assign(new Error('Preview token not found or expired'),{statusCode:404});if(String(record.user_id)!==String(userId))throw Object.assign(new Error('Preview token does not belong to current user'),{statusCode:403});
  if(!String(record.type).startsWith('master:'))throw Object.assign(new Error('Preview token is not a master import'),{statusCode:422});const type=record.type.slice(7);const successes=[],failures=[];
  for(const row of record.rows){if(row.status!=='VALID'){failures.push(row);continue;}try{const refreshed=await validateRow(type,row.original);if(refreshed.status!=='VALID'){failures.push(refreshed);continue;}await apply(type,refreshed.normalized);successes.push({source_row:row.source_row,action:refreshed.action});}catch(e){failures.push({...row,status:'INVALID',errors:[error(e.message,e.code||'COMMIT_ERROR')]});}}
  await PreviewStorage.remove(token);const result=await PreviewStorage.save({type:`master:${type}`,user_id:userId,rows:failures,is_result:true});return{summary:{total:record.rows.length,success:successes.length,failed:failures.length},successes,error_file_token:failures.length?result.token:null};
}

async function cancel(token,userId){const record=await PreviewStorage.get(token);if(!record)return false;if(String(record.user_id)!==String(userId))throw Object.assign(new Error('Preview token does not belong to current user'),{statusCode:403});await PreviewStorage.remove(token);return true;}
async function errorFile(token,userId){const record=await PreviewStorage.get(token);if(!record||!record.is_result||!String(record.type).startsWith('master:'))throw Object.assign(new Error('Error file token not found or expired'),{statusCode:404});if(String(record.user_id)!==String(userId))throw Object.assign(new Error('Preview token does not belong to current user'),{statusCode:403});const type=record.type.slice(7),spec=SPECS[type],definition=DEFINITIONS[type];const headers=[...definition.headers,'_source_row','_import_action','_import_status','_error_code','_error_message'];const rows=record.rows.map(r=>({...originalForHeaders(r.original,spec),_source_row:r.source_row,_import_action:r.action,_import_status:'FAILED',_error_code:r.errors.map(e=>e.code).join('; '),_error_message:r.errors.map(e=>e.message).join('; ')}));return{filename:`master-${type}-import-errors.xlsx`,buffer:await createWorkbookBuffer([{name:'Failed Rows',headers,rows}])};}

module.exports={preview,commit,cancel,errorFile,SPECS};
