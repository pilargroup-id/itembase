function columnNumberToLetter(n){ let s=''; while(n>0){ const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; }
function quoteSheetName(name){ return `'${String(name).replace(/'/g,"''")}'`; }
function dataRange(name,startRow,columnCount,endRow=null){ const col=columnNumberToLetter(columnCount); return `${quoteSheetName(name)}!A${startRow}:${col}${endRow?endRow:''}`; }
module.exports={dataRange};
