const ExcelJS = require('exceljs');

function normalizeCellValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'text')) return value.text;
    if (Object.prototype.hasOwnProperty.call(value, 'result')) return value.result;
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
  }
  return value;
}

async function readWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function worksheetToObjects(worksheet) {
  if (!worksheet) return [];
  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, index) => {
    headers[index - 1] = String(normalizeCellValue(cell.value) || '').trim();
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = { _source_row: rowNumber };
    let hasData = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = normalizeCellValue(row.getCell(index + 1).value);
      data[header] = value;
      if (value !== '' && value !== null && value !== undefined) hasData = true;
    });
    if (hasData) rows.push(data);
  });
  return rows;
}

function styleWorksheet(worksheet, headers) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = { from: 'A1', to: `${worksheet.getColumn(headers.length).letter}1` };
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };
  headers.forEach((header, index) => {
    const column = worksheet.getColumn(index + 1);
    column.key = header;
    column.width = Math.min(Math.max(header.length + 4, 14), 42);
  });
}

function addSheet(workbook, { name, headers, rows = [] }) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(headers.map((header) => row[header] ?? '')));
  styleWorksheet(worksheet, headers);
  return worksheet;
}

async function createWorkbookBuffer(sheets = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ItemBase';
  workbook.created = new Date();
  sheets.forEach((sheet) => addSheet(workbook, sheet));
  return workbook.xlsx.writeBuffer();
}

async function createXlsxBuffer({ sheetName = 'Export', headers = [], rows = [] }) {
  return createWorkbookBuffer([{ name: sheetName, headers, rows }]);
}

module.exports = {
  readWorkbook,
  worksheetToObjects,
  createWorkbookBuffer,
  createXlsxBuffer,
};
