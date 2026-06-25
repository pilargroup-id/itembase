const UomService = require('../../services/master/uom.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await UomService.index(req.query);

    return response.ok(res, data, 'UOMs retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await UomService.show(req.params.id);

    return response.ok(res, data, 'UOM retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await UomService.store(req.body);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await UomService.update(req.params.id, req.body);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await UomService.destroy(req.params.id);

    return response.ok(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

async function toggleStatus(req, res, next) {
  try {
    const result = await UomService.updateStatus(req.params.id, req.body.is_active);

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