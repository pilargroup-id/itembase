const Service=require('../../services/master/variant.service');const response=require('../../utils/response.util');
async function run(res,next,fn,message,status=200){try{const data=await fn();return status===201?response.created(res,data,message):response.ok(res,data,message);}catch(e){next(e);}}
const attributes=(req,res,next)=>run(res,next,()=>Service.attributes(req.query),'Variant attributes retrieved successfully');
const attribute=(req,res,next)=>run(res,next,()=>Service.attribute(req.params.id),'Variant attribute retrieved successfully');
const createAttribute=(req,res,next)=>run(res,next,()=>Service.createAttribute(req.body,req.user.id,req),'Variant attribute created successfully',201);
const updateAttribute=(req,res,next)=>run(res,next,()=>Service.updateAttribute(req.params.id,req.body,req.user.id,req),'Variant attribute updated successfully');
const statusAttribute=(req,res,next)=>run(res,next,()=>Service.statusAttribute(req.params.id,req.body.is_active,req.user.id,req),'Variant attribute status updated successfully');
const deleteAttribute=(req,res,next)=>run(res,next,async()=>{await Service.deleteAttribute(req.params.id,req.user.id,req);return null;},'Variant attribute deleted successfully');
const values=(req,res,next)=>run(res,next,()=>Service.values(req.query),'Variant values retrieved successfully');
const value=(req,res,next)=>run(res,next,()=>Service.value(req.params.id),'Variant value retrieved successfully');
const createValue=(req,res,next)=>run(res,next,()=>Service.createValue(req.body,req.user.id,req),'Variant value created successfully',201);
const updateValue=(req,res,next)=>run(res,next,()=>Service.updateValue(req.params.id,req.body,req.user.id,req),'Variant value updated successfully');
const statusValue=(req,res,next)=>run(res,next,()=>Service.statusValue(req.params.id,req.body.is_active,req.user.id,req),'Variant value status updated successfully');
const deleteValue=(req,res,next)=>run(res,next,async()=>{await Service.deleteValue(req.params.id,req.user.id,req);return null;},'Variant value deleted successfully');
module.exports={attributes,attribute,createAttribute,updateAttribute,statusAttribute,deleteAttribute,values,value,createValue,updateValue,statusValue,deleteValue};
