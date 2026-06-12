const PicService = require('../../services/master/pic.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await PicService.index(req.query);

    return response.ok(res, data, 'PICs retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await PicService.show(req.params.id);

    return response.ok(res, data, 'PIC retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await PicService.store(req.body);

    return response.created(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await PicService.update(req.params.id, req.body);

    return response.ok(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const result = await PicService.destroy(req.params.id);

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