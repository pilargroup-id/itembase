const CategoryService = require('../../services/master/category.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await CategoryService.index(req.query);

    return response.ok(res, data, 'Categories retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await CategoryService.show(req.params.id);

    return response.ok(res, data, 'Category retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await CategoryService.store(req.body, req.user.id, req);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await CategoryService.update(req.params.id, req.body, req.user.id, req);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await CategoryService.destroy(req.params.id, req.user.id, req);

    return response.ok(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

async function toggleStatus(req, res, next) {
  try {
    const result = await CategoryService.updateStatus(
      req.params.id,
      req.body.is_active,
      req.user.id,
      req
    );

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
