const SkuStatusService = require('../../services/master/sku-status.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await SkuStatusService.index(req.query);

    return response.ok(res, data, 'SKU statuses retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await SkuStatusService.show(req.params.id);

    return response.ok(res, data, 'SKU status retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await SkuStatusService.store(req.body);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await SkuStatusService.update(req.params.id, req.body);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await SkuStatusService.destroy(req.params.id);

    return response.ok(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};