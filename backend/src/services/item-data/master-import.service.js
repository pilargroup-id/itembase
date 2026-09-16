const Model = require('../../models/item-data/master-data.model');
const PreviewStorage = require('./preview-storage.service');
const DirectoryService = require('../pilargroup-directory.service');
const { readWorkbook, worksheetToObjects, createWorkbookBuffer } = require('../../utils/xlsx.util');
const { DEFINITIONS } = require('./master-export.service');
const { IMPORT_HEADERS } = require('./master-template.service');

const PRODUCT_DEPARTMENT_ID = 13;

const SPECS = {
  brands: {
    sheet: 'Brands',
    headers: IMPORT_HEADERS.brands,
    map: { Name: 'name', 'Business Unit Code': 'business_unit_codes', 'Channel Code': 'channel_codes', Status: 'is_active' },
    required: ['name'],
  },
  categories: {
    sheet: 'Categories',
    headers: IMPORT_HEADERS.categories,
    map: { Category: 'detail_category', 'Sub Category': 'sub_category', 'Main Category': 'main_category', 'Brand Category': 'brand_category', PIC: 'pic_usernames', Status: 'is_active' },
    required: ['detail_category','sub_category','main_category','brand_category'],
  },
  'item-sources': {
    sheet: 'Item Sources',
    headers: IMPORT_HEADERS['item-sources'],
    map: { 'Item Source Name': 'name', Status: 'is_active' },
    required: ['name'],
  },
  ports: {
    sheet: 'Ports',
    headers: IMPORT_HEADERS.ports,
    map: { 'Country Code': 'country_code', 'Port Code': 'code', 'Port Name': 'name', Status: 'is_active' },
    required: ['country_code','code','name'],
  },
  uoms: {
    sheet: 'UOMs',
    headers: IMPORT_HEADERS.uoms,
    map: { 'UOM Name': 'name', Status: 'is_active' },
    required: ['name'],
  },
  'variant-attributes': {
    sheet: 'Variant Attributes',
    headers: IMPORT_HEADERS['variant-attributes'],
    map: { 'Attribute Name': 'name', Status: 'is_active' },
    required: ['name'],
  },
  'variant-values': {
    sheet: 'Variant Values',
    headers: IMPORT_HEADERS['variant-values'],
    map: { 'Attribute Code': 'attribute_code', 'Value Name': 'value_name', 'Sort Order': 'sort_order', Status: 'is_active' },
    required: ['attribute_code','value_name'],
  },
  'sub-brands': {
    sheet: 'Sub Brands',
    headers: IMPORT_HEADERS['sub-brands'],
    map: { 'Sub Brand': 'name', Status: 'is_active' },
    required: ['name'],
  },
};

function text(v){return v===undefined||v===null?'':String(v).trim();}
function error(message,code='VALIDATION_ERROR'){return{code,message};}
function statusValue(v){const s=text(v).toLowerCase();if(['active','1','true','yes'].includes(s))return 1;if(['inactive','0','false','no'].includes(s))return 0;return null;}
function remap(row,map){const out={_source_row:row._source_row};Object.entries(map).forEach(([h,k])=>{if(Object.prototype.hasOwnProperty.call(row,h))out[k]=row[h];});return out;}
function isExample(row){return Object.values(row).some((v)=>/^EXAMPLE_/i.test(text(v))||/^EXAMPLE /i.test(text(v)));}
function splitList(value){return text(value).split(';').map((v)=>v.trim()).filter(Boolean);}
function originalForHeaders(row,spec){const out={};Object.entries(spec.map).forEach(([h,k])=>{out[h]=row?.[k]??'';});return out;}
function generatedCode(value){return text(value).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function normalizeKey(value){return text(value).toLowerCase();}

function validateGeneratedCode(code, maxLength, label, errors) {
  if (!code) errors.push(error(`${label} cannot generate an empty code`, 'INVALID_GENERATED_CODE'));
  else if (code.length > maxLength) errors.push(error(`${label} generated code cannot be longer than ${maxLength} characters`, 'INVALID_GENERATED_CODE'));
}

async function resolveProductUsers(value, errors) {
  const usernames = splitList(value);
  if (!usernames.length) return [];

  const allUsers = await DirectoryService.getUsers();
  const productUsers = allUsers.filter((user) => Number(user.department_id) === PRODUCT_DEPARTMENT_ID && Number(user.is_active) === 1);
  const byUsername = new Map(productUsers.map((user) => [normalizeKey(user.username), user]));
  const seen = new Set();
  const resolved = [];

  usernames.forEach((username) => {
    const key = normalizeKey(username);
    if (seen.has(key)) {
      errors.push(error(`Duplicate PIC username ${username}`, 'DUPLICATE_REFERENCE'));
      return;
    }
    seen.add(key);
    const user = byUsername.get(key);
    if (!user) {
      errors.push(error(`PIC username ${username} not found as active Product department user`, 'REFERENCE_NOT_FOUND'));
      return;
    }
    resolved.push({ central_user_id: String(user.id), username: user.username });
  });

  return resolved;
}

async function resolveBrandChannels(businessUnitValue, channelValue, errors) {
  const businessUnitCodes = splitList(businessUnitValue);
  const channelCodes = splitList(channelValue);

  if (!businessUnitCodes.length && !channelCodes.length) return null;
  if (!businessUnitCodes.length || !channelCodes.length) {
    errors.push(error('Business Unit Code and Channel Code must both be supplied', 'REQUIRED_PAIR'));
    return [];
  }
  if (businessUnitCodes.length !== channelCodes.length) {
    errors.push(error('Business Unit Code and Channel Code must contain the same number of semicolon-separated values', 'PAIR_COUNT_MISMATCH'));
    return [];
  }

  const businessUnits = (await DirectoryService.getBusinessUnits()).filter((row) => Number(row.is_active) === 1);
  const buByCode = new Map(businessUnits.map((row) => [normalizeKey(row.code), row]));
  const resolved = [];
  const seen = new Set();

  for (let index = 0; index < businessUnitCodes.length; index += 1) {
    const buCode = businessUnitCodes[index];
    const channelCode = channelCodes[index];
    const bu = buByCode.get(normalizeKey(buCode));
    if (!bu) {
      errors.push(error(`Business Unit Code ${buCode} not found or inactive`, 'REFERENCE_NOT_FOUND'));
      continue;
    }

    const departments = (await DirectoryService.getBusinessUnitDepartments(bu.id)).filter((row) => Number(row.is_active) === 1);
    const department = departments.find((row) => normalizeKey(row.department_code) === normalizeKey(channelCode));
    if (!department) {
      errors.push(error(`Channel Code ${channelCode} not found or inactive for Business Unit ${buCode}`, 'REFERENCE_NOT_FOUND'));
      continue;
    }

    const pairKey = `${String(bu.id)}:${Number(department.department_id)}`;
    if (seen.has(pairKey)) {
      errors.push(error(`Duplicate Business Unit/Channel pair ${buCode}/${channelCode}`, 'DUPLICATE_REFERENCE'));
      continue;
    }
    seen.add(pairKey);
    resolved.push({
      business_unit_id: String(bu.id),
      department_id: Number(department.department_id),
      channel_name: department.department_name || null,
      channel_code: department.department_code || channelCode,
    });
  }

  return resolved;
}

async function findExisting(type, row) {
  if (type === 'variant-values') {
    const attributeCode = text(row.attribute_code).toUpperCase();
    const valueCode = generatedCode(row.value_name);
    return Model.findByPivot(type, attributeCode, valueCode);
  }
  if (type === 'brands') return Model.findByPivot(type, generatedCode(row.name));
  if (type === 'item-sources') return Model.findByPivot(type, generatedCode(row.name));
  if (type === 'uoms') return Model.findByPivot(type, generatedCode(row.name));
  if (type === 'variant-attributes') return Model.findByPivot(type, generatedCode(row.name));
  if (type === 'ports') return Model.findByPivot(type, text(row.code));
  if (type === 'categories') return Model.findByPivot(type, text(row.detail_category));
  if (type === 'sub-brands') return Model.findByPivot(type, text(row.name));
  return null;
}

async function validateRow(type,row){
  const spec=SPECS[type];const errors=[];
  const existing=await findExisting(type,row);
  const action=existing?'UPDATE':'CREATE';
  const fields={};

  for(const field of Object.values(spec.map)){
    if(['is_active','business_unit_codes','channel_codes','pic_usernames','sort_order'].includes(field))continue;
    if(text(row[field])!=='')fields[field]=text(row[field]);
  }

  if(!existing){
    for(const field of spec.required){if(!text(row[field]))errors.push(error(`${field} is required for create`,'REQUIRED_FIELD'));}
  }

  if(text(row.is_active)!==''){
    const v=statusValue(row.is_active);if(v===null)errors.push(error('Status must be Active or Inactive'));else fields.is_active=v;
  }else if(!existing)fields.is_active=1;

  if(type==='brands'){
    if(fields.name){
      fields.code=generatedCode(fields.name);
      validateGeneratedCode(fields.code,50,'Brand',errors);
    }
    const channels=await resolveBrandChannels(row.business_unit_codes,row.channel_codes,errors);
    if(channels!==null)fields.channels=channels;
  }

  if(type==='categories'&&text(row.pic_usernames)!==''){
    fields.pic_users=await resolveProductUsers(row.pic_usernames,errors);
  }

  if(type==='ports'&&fields.country_code){
    fields.country_code=fields.country_code.toUpperCase();
    if(!/^[A-Z]{2}$/.test(fields.country_code))errors.push(error('Country Code must contain exactly 2 letters'));
    if(fields.code){
      fields.code=fields.code.toUpperCase();
      if(!fields.code.startsWith(fields.country_code))errors.push(error('Port Code must start with Country Code'));
    }
  }

  if(type==='item-sources'&&fields.name){
    fields.code=generatedCode(fields.name);
    validateGeneratedCode(fields.code,50,'Item Source',errors);
  }

  if(type==='uoms'&&fields.name){
    fields.code=generatedCode(fields.name);
    validateGeneratedCode(fields.code,50,'UOM',errors);
  }

  if(type==='variant-attributes'&&fields.name){
    fields.code=generatedCode(fields.name);
    validateGeneratedCode(fields.code,30,'Variant Attribute',errors);
  }

  if(type==='variant-values'){
    if(fields.attribute_code)fields.attribute_code=fields.attribute_code.toUpperCase();
    if(fields.value_name){
      fields.value_name=fields.value_name.toUpperCase();
      fields.value_code=generatedCode(fields.value_name);
      validateGeneratedCode(fields.value_code,50,'Variant Value',errors);
    }
    if(text(row.sort_order)!==''){
      const sortOrder=Number(row.sort_order);
      if(!Number.isInteger(sortOrder)||sortOrder<1)errors.push(error('Sort Order must be a positive integer'));
      else fields.sort_order=sortOrder;
    }
    const attr=fields.attribute_code?await Model.findVariantAttributeByCode(fields.attribute_code):null;
    if(fields.attribute_code&&(!attr||!Number(attr.is_active)))errors.push(error(`Variant Attribute ${fields.attribute_code} not found or inactive`,'REFERENCE_NOT_FOUND'));
    if(attr)fields.attribute_id=attr.id;
  }

  if(type==='sub-brands'&&fields.name)fields.normalized_name=fields.name.toLowerCase();

  const meaningfulKeys=Object.keys(fields).filter((key)=>!['code','value_code','attribute_id'].includes(key));
  if(existing&&!meaningfulKeys.length)errors.push(error('No fields supplied for update','NO_CHANGES'));

  return{source_row:row._source_row,action,status:errors.length?'INVALID':'VALID',errors,original:row,normalized:{existing_id:existing?.id||null,fields}};
}

function duplicateKey(type,row){
  if(type==='variant-values')return `${text(row.attribute_code).toUpperCase()}|${generatedCode(row.value_name)}`;
  if(type==='brands'||type==='item-sources'||type==='uoms'||type==='variant-attributes')return generatedCode(row.name);
  if(type==='ports')return text(row.code).toUpperCase();
  if(type==='categories')return normalizeKey(row.detail_category);
  if(type==='sub-brands')return normalizeKey(row.name);
  return '';
}

async function preview(type,buffer,userId){
  const spec=SPECS[type];if(!spec)throw Object.assign(new Error('Unsupported master import type'),{statusCode:422});
  await PreviewStorage.cleanupExpired();
  const workbook=await readWorkbook(buffer);const rows=worksheetToObjects(workbook.getWorksheet(spec.sheet)).map((r)=>remap(r,spec.map)).filter((r)=>!isExample(r));
  const results=[];for(const row of rows)results.push(await validateRow(type,row));
  const seen=new Set();const dup=new Set();results.forEach((r)=>{const key=duplicateKey(type,r.original);if(seen.has(key))dup.add(key);seen.add(key);r._key=key;});
  results.forEach((r)=>{if(dup.has(r._key)){r.errors.push(error('Duplicate pivot value in uploaded file','DUPLICATE_FILE_CODE'));r.status='INVALID';}delete r._key;});
  const record=await PreviewStorage.save({type:`master:${type}`,user_id:userId,rows:results});
  return{preview_token:record.token,expires_at:record.expires_at,summary:{total:results.length,valid:results.filter(r=>r.status==='VALID').length,invalid:results.filter(r=>r.status==='INVALID').length},rows:results.map(({normalized,...r})=>r)};
}

async function apply(type,normalized){
  return Model.transaction(async(connection)=>{
    const fields={...normalized.fields};

    if(type==='variant-values'){
      const existing=await Model.findByPivot(type,fields.attribute_code,fields.value_code,connection);
      delete fields.attribute_code;
      if(existing)await Model.update(type,existing.id,fields,connection);else await Model.create(type,fields,connection);
      return;
    }

    if(type==='brands'){
      const channels=fields.channels;delete fields.channels;
      const existing=await Model.findByPivot(type,fields.code, null, connection);
      let id=existing?.id;
      if(existing)await Model.update(type,id,fields,connection);else id=await Model.create(type,fields,connection);
      if(channels!==undefined)await Model.replaceBrandChannels(id,channels,connection);
      return;
    }

    if(type==='categories'){
      const picUsers=fields.pic_users;delete fields.pic_users;
      const existing=await Model.findByPivot(type,fields.detail_category,null,connection);
      let id=existing?.id;
      if(existing)await Model.update(type,id,fields,connection);else id=await Model.create(type,fields,connection);
      if(picUsers!==undefined)await Model.replaceCategoryUsers(id,picUsers,connection);
      return;
    }

    const spec=SPECS[type];
    const pivotValue=type==='item-sources'||type==='uoms'||type==='variant-attributes'?fields.code:type==='ports'?fields.code:fields.name;
    const existing=await Model.findByPivot(type,pivotValue,null,connection);
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
async function errorFile(token,userId){const record=await PreviewStorage.get(token);if(!record||!record.is_result||!String(record.type).startsWith('master:'))throw Object.assign(new Error('Error file token not found or expired'),{statusCode:404});if(String(record.user_id)!==String(userId))throw Object.assign(new Error('Preview token does not belong to current user'),{statusCode:403});const type=record.type.slice(7),spec=SPECS[type];const headers=[...spec.headers,'_source_row','_import_action','_import_status','_error_code','_error_message'];const rows=record.rows.map(r=>({...originalForHeaders(r.original,spec),_source_row:r.source_row,_import_action:r.action,_import_status:'FAILED',_error_code:r.errors.map(e=>e.code).join('; '),_error_message:r.errors.map(e=>e.message).join('; ')}));return{filename:`master-${type}-import-errors.xlsx`,buffer:await createWorkbookBuffer([{name:'Failed Rows',headers,rows}])};}

module.exports={preview,commit,cancel,errorFile,SPECS};
