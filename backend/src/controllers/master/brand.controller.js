const BrandService = require('../../services/master/brand.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await BrandService.index(req.query);

    return response.ok(res, data, 'Brands retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await BrandService.show(req.params.id);

    return response.ok(res, data, 'Brand retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await BrandService.store(req.body);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await BrandService.update(req.params.id, req.body);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await BrandService.destroy(req.params.id);

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