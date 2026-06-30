const response = require('../../utils/response.util');
const ItemParentService = require('../../services/item/item-parent.service');

function handleServiceError(res, error) {
  if (!error) return false;

  if (error.type === 'validation') {
    response.badRequest(res, error.message, error.errors);
    return true;
  }

  if (error.type === 'not_found') {
    response.notFound(res, error.message);
    return true;
  }

  response.badRequest(res, error.message || 'Request failed');
  return true;
}

async function index(req, res, next) {
  try {
    const result = await ItemParentService.getAll(req.query);

    return response.paginated(
      res,
      result.data,
      result.meta,
      'Item parents retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

async function show(req, res, next) {
  try {
    const itemParent = await ItemParentService.getById(req.params.id);

    if (!itemParent) {
      return response.notFound(res, 'Item parent not found');
    }

    return response.ok(
      res,
      itemParent,
      'Item parent retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const result = await ItemParentService.create(req.body, req.user.id, req);

    if (handleServiceError(res, result.error)) {
      return;
    }

    return response.created(
      res,
      result.data,
      'Item parent created successfully'
    );
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await ItemParentService.update(
      req.params.id,
      req.body,
      req.user.id,
      req
    );

    if (handleServiceError(res, result.error)) {
      return;
    }

    return response.ok(
      res,
      result.data,
      'Item parent updated successfully'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index,
  show,
  store,
  update,
};