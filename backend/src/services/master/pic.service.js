const PicModel = require('../../models/master/pic.model');

function normalizePayload(payload) {
  return {
    code: payload.code,
    name: payload.name,
    is_active: payload.is_active ?? 1,
  };
}

function validatePayload(payload) {
  if (!payload.code || String(payload.code).trim() === '') {
    const error = new Error('Code is required');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!payload.name || String(payload.name).trim() === '') {
    const error = new Error('Name is required');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
}

async function index(query) {
  return PicModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const pic = await PicModel.findById(id);

  if (!pic) {
    const error = new Error('PIC not found');
    error.statusCode = 404;
    error.code = 'PIC_NOT_FOUND';
    throw error;
  }

  return pic;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await PicModel.create(normalizedPayload);
  const createdPic = await PicModel.findById(createdId);

  return {
    message: 'PIC created successfully',
    data: createdPic,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await PicModel.update(id, normalizedPayload);

  const updatedPic = await PicModel.findById(id);

  return {
    message: 'PIC updated successfully',
    data: updatedPic,
  };
}

async function destroy(id) {
  await show(id);
  await PicModel.remove(id);

  return {
    message: 'PIC deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};