const response = require('../../utils/response.util');
const ItemService = require('../../services/item/item.service');

function handleError(res, error) {
  if (error.statusCode === 404) {
    return response.notFound(res, error.message);
  }

  if (error.statusCode === 401) {
    return response.unauthorized(res, error.message);
  }

  if (error.statusCode === 403) {
    return response.forbidden(res, error.message);
  }

  if (error.statusCode === 409) {
    return response.error(res, error.message, 409, error.errors || null);
  }

  if (error.statusCode === 422) {
    return response.badRequest(res, error.message, error.errors || null);
  }

  return response.badRequest(res, error.message || 'Request failed', error.errors || null);
}

async function index(req, res) {
  try {
    const result = await ItemService.index(req.query);

    return response.paginated(
      res,
      result.data,
      result.meta,
      'Items retrieved successfully'
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function show(req, res) {
  try {
    const item = await ItemService.show(req.params.id);

    return response.ok(
      res,
      item,
      'Item retrieved successfully'
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function store(req, res) {
  try {
    const item = await ItemService.store(req.body, req.user.id, req);

    return response.created(
      res,
      item,
      'Item created successfully'
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const item = await ItemService.update(
      req.params.id,
      req.body,
      req.user.id,
      req
    );

    return response.ok(
      res,
      item,
      'Item updated successfully'
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function previewMatrix(req,res){try{return response.ok(res,await ItemService.previewMatrix(req.body),'Item matrix preview generated successfully');}catch(error){return handleError(res,error);}}
async function createMatrix(req,res){try{return response.created(res,await ItemService.createMatrix(req.body,req.user.id,req),'Item matrix created successfully');}catch(error){return handleError(res,error);}}

module.exports = {
  previewMatrix,
  createMatrix,
  index,
  show,
  store,
  update,
};