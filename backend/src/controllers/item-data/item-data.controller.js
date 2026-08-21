const response = require('../../utils/response.util');
const ExportService = require('../../services/item-data/item-export.service');
const MasterExportService = require('../../services/item-data/master-export.service');
const InactiveItemService = require('../../services/item-data/inactive-item.service');
const TemplateService = require('../../services/item-data/item-template.service');
const MasterTemplateService = require('../../services/item-data/master-template.service');
const ImportService = require('../../services/item-data/item-import.service');
const MasterImportService = require('../../services/item-data/master-import.service');

function sendFile(res, result) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.setHeader('Content-Length', result.buffer.length);
  return res.send(result.buffer);
}

async function exportItems(req, res, next) {
  try { return sendFile(res, await ExportService.exportItems(req.query)); }
  catch (err) { return next(err); }
}

async function exportParents(req, res, next) {
  try { return sendFile(res, await ExportService.exportParents(req.query)); }
  catch (err) { return next(err); }
}

async function exportMaster(req, res, next) {
  try { return sendFile(res, await MasterExportService.exportMaster(req.params.type, req.query)); }
  catch (err) { return next(err); }
}

async function inactiveItems(req, res, next) {
  try {
    const result = await InactiveItemService.index(req.query);
    return response.paginated(res, result.data, result.meta, 'Inactive items retrieved successfully');
  } catch (err) { return next(err); }
}

async function template(req, res, next) {
  try { return sendFile(res, await TemplateService.generate(req.params.type)); }
  catch (err) { return next(err); }
}

async function masterTemplate(req, res, next) {
  try { return sendFile(res, await MasterTemplateService.generate(req.params.type)); }
  catch (err) { return next(err); }
}

async function preview(req, res, next) {
  try {
    if (!req.file) return response.badRequest(res, 'Excel file is required');
    const result = await ImportService.preview(req.params.type, req.file.buffer, req.user.id);
    return response.ok(res, result, 'Import preview generated');
  } catch (err) { return next(err); }
}

async function masterPreview(req, res, next) {
  try {
    if (!req.file) return response.badRequest(res, 'Excel file is required');
    const result = await MasterImportService.preview(req.params.type, req.file.buffer, req.user.id);
    return response.ok(res, result, 'Master import preview generated');
  } catch (err) { return next(err); }
}

async function commit(req, res, next) {
  try { return response.ok(res, await ImportService.commit(req.body.preview_token, req.user.id), 'Import committed'); }
  catch (err) { return next(err); }
}

async function masterCommit(req, res, next) {
  try { return response.ok(res, await MasterImportService.commit(req.body.preview_token, req.user.id), 'Master import committed'); }
  catch (err) { return next(err); }
}

async function cancel(req, res, next) {
  try { await ImportService.cancel(req.params.token, req.user.id); return response.ok(res, null, 'Import preview canceled'); }
  catch (err) { return next(err); }
}

async function masterCancel(req, res, next) {
  try { await MasterImportService.cancel(req.params.token, req.user.id); return response.ok(res, null, 'Master import preview canceled'); }
  catch (err) { return next(err); }
}

async function errorFile(req, res, next) {
  try { return sendFile(res, await ImportService.errorFile(req.params.token, req.user.id)); }
  catch (err) { return next(err); }
}

async function masterErrorFile(req, res, next) {
  try { return sendFile(res, await MasterImportService.errorFile(req.params.token, req.user.id)); }
  catch (err) { return next(err); }
}

module.exports = {
  exportItems,
  exportParents,
  exportMaster,
  inactiveItems,
  template,
  masterTemplate,
  preview,
  masterPreview,
  commit,
  masterCommit,
  cancel,
  masterCancel,
  errorFile,
  masterErrorFile,
};
