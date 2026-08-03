const response=require('../../utils/response.util');
const ExportService=require('../../services/item-data/item-export.service');
const TemplateService=require('../../services/item-data/item-template.service');
const ImportService=require('../../services/item-data/item-import.service');

function sendFile(res,result){
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename="${result.filename}"`);
  res.setHeader('Content-Length',result.buffer.length);
  return res.send(result.buffer);
}
async function exportData(req,res,next){try{return sendFile(res,await ExportService.exportType(req.params.type,req.query));}catch(err){return next(err);}}
async function template(req,res,next){try{return sendFile(res,await TemplateService.generate(req.params.type));}catch(err){return next(err);}}
async function preview(req,res,next){try{if(!req.file)return response.badRequest(res,'Excel file is required');const result=await ImportService.preview(req.params.type,req.file.buffer,req.user.id);return response.ok(res,result,'Import preview generated');}catch(err){return next(err);}}
async function commit(req,res,next){try{const result=await ImportService.commit(req.body.preview_token,req.user.id);return response.ok(res,result,'Import committed');}catch(err){return next(err);}}
async function cancel(req,res,next){try{await ImportService.cancel(req.params.token,req.user.id);return response.ok(res,null,'Import preview canceled');}catch(err){return next(err);}}
async function errorFile(req,res,next){try{return sendFile(res,await ImportService.errorFile(req.params.token,req.user.id));}catch(err){return next(err);}}
module.exports={exportData,template,preview,commit,cancel,errorFile};
