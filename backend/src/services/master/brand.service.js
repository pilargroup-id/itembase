const BrandModel = require('../../models/master/brand.model');

function normalizePayload(payload) {
  return {
    name: payload.name,
    code: payload.code,
    is_active: payload.is_active ?? 1,
  };
}

function validatePayload(payload) {
  if (!payload.name || String(payload.name).trim() === '') {
    const error = new Error('Name is required');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!payload.code || String(payload.code).trim() === '') {
    const error = new Error('Code is required');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
}

async function index(query) {
  return BrandModel.findAll({
    search: query.search,
    is_active: query.is_active,
  });
}

async function show(id) {
  const brand = await BrandModel.findById(id);

  if (!brand) {
    const error = new Error('Brand not found');
    error.statusCode = 404;
    error.code = 'BRAND_NOT_FOUND';
    throw error;
  }

  return brand;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);
  const createdId = await BrandModel.create(normalizedPayload);
  const createdBrand = await BrandModel.findById(createdId);

  return {
    message: 'Brand created successfully',
    data: createdBrand,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await BrandModel.update(id, normalizedPayload);

  const updatedBrand = await BrandModel.findById(id);

  return {
    message: 'Brand updated successfully',
    data: updatedBrand,
  };
}

async function destroy(id) {
  await show(id);
  await BrandModel.remove(id);

  return {
    message: 'Brand deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};