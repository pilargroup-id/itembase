const config=require('../../config');
const sheets=require('./sheets.client');
const mappings=require('./workbook-mappings');
const {readView}=require('./bigquery-reader');
const {dataRange}=require('./sheet-utils');

const WRITE_INTERVAL_MS=Math.max(1000,Number(process.env.GSHEET_WRITE_INTERVAL_MS||1500));
const WRITE_MAX_RETRIES=Math.max(0,Number(process.env.GSHEET_WRITE_MAX_RETRIES||6));
const WRITE_RETRY_BASE_MS=Math.max(1000,Number(process.env.GSHEET_WRITE_RETRY_BASE_MS||5000));
let lastWriteAt=0;

const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

function httpStatus(err){
  return Number(err?.response?.status||err?.code||err?.status||err?.statusCode||0);
}

function retryAfterMs(err){
  const h=err?.response?.headers?.['retry-after']||err?.response?.headers?.get?.('retry-after');
  if(!h) return 0;
  const s=Number(h);
  return Number.isFinite(s)&&s>0?s*1000:0;
}

function retryable(err){
  const s=httpStatus(err);
  const m=String(err?.message||'').toLowerCase();
  return [429,500,502,503,504].includes(s)||m.includes('quota exceeded')||m.includes('rate limit');
}

async function waitWriteSlot(){
  const elapsed=Date.now()-lastWriteAt;
  const wait=Math.max(0,WRITE_INTERVAL_MS-elapsed);
  if(wait) await sleep(wait);
  lastWriteAt=Date.now();
}

async function writeRequest(label,fn){
  for(let attempt=0;;attempt++){
    await waitWriteSlot();
    try{
      return await fn();
    }catch(err){
      if(!retryable(err)||attempt>=WRITE_MAX_RETRIES) throw err;
      const wait=Math.max(
        retryAfterMs(err),
        Math.min(WRITE_RETRY_BASE_MS*(2**attempt),60000)
      );
      console.warn(`[gsheet] write throttled (${label}); retry ${attempt+1}/${WRITE_MAX_RETRIES} in ${(wait/1000).toFixed(1)}s`);
      await sleep(wait);
    }
  }
}

async function getMetadata(){
  const r=await sheets.spreadsheets.get({spreadsheetId:config.gsheet.spreadsheetId,fields:'properties.title,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))'});
  return r.data;
}

function validate(metadata){
  const map=new Map((metadata.sheets||[]).map(s=>[s.properties.title,s.properties]));
  const missing=mappings.map(m=>m.sheetName).filter(n=>!map.has(n));
  if(missing.length) throw new Error(`Google Sheet tab(s) not found: ${missing.join(', ')}`);
  return map;
}

async function ensureCapacity(p,rows,cols){
  const req=[];
  const gp=p.gridProperties||{};
  if((gp.rowCount||0)<rows) req.push({appendDimension:{sheetId:p.sheetId,dimension:'ROWS',length:rows-gp.rowCount}});
  if((gp.columnCount||0)<cols) req.push({appendDimension:{sheetId:p.sheetId,dimension:'COLUMNS',length:cols-gp.columnCount}});
  if(req.length){
    await writeRequest(`resize ${p.title}`,()=>sheets.spreadsheets.batchUpdate({spreadsheetId:config.gsheet.spreadsheetId,requestBody:{requests:req}}));
  }
}

async function clear(mapping){
  await writeRequest(`clear ${mapping.sheetName}`,()=>sheets.spreadsheets.values.clear({spreadsheetId:config.gsheet.spreadsheetId,range:dataRange(mapping.sheetName,mapping.clearStartRow,mapping.columns.length),requestBody:{}}));
}

async function write(mapping,rows,startRow){
  if(!rows.length) return 0;
  const size=config.gsheet.writeChunkRows;
  let written=0;
  for(let i=0;i<rows.length;i+=size){
    const chunk=rows.slice(i,i+size);
    const s=startRow+i;
    const e=s+chunk.length-1;
    await writeRequest(`write ${mapping.sheetName} ${s}-${e}`,()=>sheets.spreadsheets.values.update({spreadsheetId:config.gsheet.spreadsheetId,range:dataRange(mapping.sheetName,s,mapping.columns.length,e),valueInputOption:'RAW',requestBody:{majorDimension:'ROWS',values:chunk}}));
    written+=chunk.length;
  }
  return written;
}

async function syncSheet(mapping,p){
  const rows=await readView(mapping);
  const staticRows=mapping.staticRows||[];
  const required=Math.max(mapping.dataStartRow+rows.length,mapping.clearStartRow+staticRows.length);
  await ensureCapacity(p,required,mapping.columns.length);
  await clear(mapping);
  if(staticRows.length) await write(mapping,staticRows,mapping.clearStartRow);
  return write(mapping,rows,mapping.dataStartRow);
}

async function run(){
  const started=Date.now();
  console.log('='.repeat(60));
  console.log('[gsheet] Itembase workbook sync started');
  console.log(`[gsheet] spreadsheet: ${config.gsheet.spreadsheetId}`);
  console.log(`[gsheet] project    : ${config.bigquery.projectId}`);
  console.log(`[gsheet] dataset    : ${config.bigquery.dataset}`);
  console.log(`[gsheet] write pace : ${WRITE_INTERVAL_MS}ms/request`);
  console.log('='.repeat(60));
  const meta=await getMetadata();
  const map=validate(meta);
  console.log(`[gsheet] workbook   : ${meta.properties?.title||'(untitled)'}`);
  console.log('[gsheet] required tabs validation passed');
  let total=0;
  for(const m of mappings){
    const count=await syncSheet(m,map.get(m.sheetName));
    total+=count;
    console.log(`[gsheet] ${m.viewName} -> ${m.sheetName}: ${count} rows`);
  }
  console.log('='.repeat(60));
  console.log('[gsheet] Itembase workbook sync completed');
  console.log(`[gsheet] Data rows: ${total}`);
  console.log(`[gsheet] Duration : ${((Date.now()-started)/1000).toFixed(2)}s`);
  console.log('='.repeat(60));
}

run().catch(err=>{
  console.error('='.repeat(60));
  console.error('[gsheet] Itembase workbook sync FAILED');
  console.error(`[gsheet] ${err.stack||err.message||err}`);
  process.exitCode=1;
});
