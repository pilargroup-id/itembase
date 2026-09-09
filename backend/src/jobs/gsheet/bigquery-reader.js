const { BigQuery } = require('@google-cloud/bigquery');
const config = require('../../config');
const bigquery = new BigQuery({ projectId: config.bigquery.projectId });
function q(id){ return `\`${String(id).replace(/`/g,'')}\``; }
function normalizeCell(value){
  if(value===null||value===undefined) return '';
  if(['string','number','boolean'].includes(typeof value)) return value;
  if(typeof value==='bigint') return value.toString();
  if(value instanceof Date) return value.toISOString();
  if(typeof value==='object' && Object.prototype.hasOwnProperty.call(value,'value')){
    const raw=value.value; const type=value.constructor?.name||'';
    if(/Numeric|Int/i.test(type) && typeof raw==='string' && /^-?\d+(\.\d+)?$/.test(raw)){
      const n=Number(raw); if(Number.isFinite(n)) return n;
    }
    return raw ?? '';
  }
  return String(value);
}
async function readView(mapping){
  const cols=mapping.columns.map(q).join(',\n  ');
  const order=mapping.orderBy?.length ? `\nORDER BY ${mapping.orderBy.map(q).join(', ')}` : '';
  const query=`SELECT\n  ${cols}\nFROM \`${config.bigquery.projectId}.${config.bigquery.dataset}.${mapping.viewName}\`${order}`;
  const [rows]=await bigquery.query({query,location:config.bigquery.location});
  return rows.map(row=>mapping.columns.map(c=>normalizeCell(row[c])));
}
module.exports={readView};
