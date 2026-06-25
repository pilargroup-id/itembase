const ItemTypeService = require('../../services/master/item-type.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await ItemTypeService.index(req.query);

    return response.ok(res, data, 'Item types retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await ItemTypeService.show(req.params.id);

    return response.ok(res, data, 'Item type retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await ItemTypeService.store(req.body);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await ItemTypeService.update(req.params.id, req.body);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await ItemTypeService.destroy(req.params.id);

    return response.ok(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

async function toggleStatus(req, res, next) {
  try {
    const result = await ItemTypeService.updateStatus(req.params.id, req.body.is_active);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  index,
  show,
  store,
  update,
  toggleStatus,
  destroy,
};