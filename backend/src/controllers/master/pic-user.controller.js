const PicUserService = require('../../services/master/pic-user.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await PicUserService.index(req.query);

    return response.ok(res, data, 'PIC users retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function options(req, res, next) {
  try {
    const data = await PicUserService.options(req.query);

    return response.ok(res, data, 'PIC user options retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await PicUserService.show(req.params.id);

    return response.ok(res, data, 'PIC user retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await PicUserService.store(req.body);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await PicUserService.update(req.params.pic_id, req.body);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await PicUserService.destroy(req.params.id);

    return response.ok(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  index,
  options,
  show,
  store,
  update,
  destroy,
};