const CategoryModel = require('../../models/master/category.model');

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizePayload(payload) {
  return {
    detail_category: payload.detail_category,
    sub_category: payload.sub_category,
    main_category: payload.main_category,
    brand_category: payload.brand_category,
    pic_id: payload.pic_id || null,
    is_active: payload.is_active ?? 1,
  };
}

function validatePayload(payload) {
  if (!payload.detail_category || String(payload.detail_category).trim() === '') {
    throw makeError('Detail category is required', 422, 'VALIDATION_ERROR');
  }

  if (!payload.sub_category || String(payload.sub_category).trim() === '') {
    throw makeError('Sub category is required', 422, 'VALIDATION_ERROR');
  }

  if (!payload.main_category || String(payload.main_category).trim() === '') {
    throw makeError('Main category is required', 422, 'VALIDATION_ERROR');
  }

  if (!payload.brand_category || String(payload.brand_category).trim() === '') {
    throw makeError('Brand category is required', 422, 'VALIDATION_ERROR');
  }
}

async function validateRelations(payload) {
  if (!payload.pic_id) {
    return;
  }

  const pic = await CategoryModel.findPicById(payload.pic_id);

  if (!pic) {
    throw makeError('PIC not found', 404, 'PIC_NOT_FOUND');
  }
}

async function index(query) {
  return CategoryModel.findAll({
    search: query.search,
    pic_id: query.pic_id,
    main_category: query.main_category,
    sub_category: query.sub_category,
    brand_category: query.brand_category,
    is_active: query.is_active,
  });
}

async function show(id) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw makeError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  return category;
}

async function store(payload) {
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await validateRelations(normalizedPayload);

  const createdId = await CategoryModel.create(normalizedPayload);
  const createdCategory = await CategoryModel.findById(createdId);

  return {
    message: 'Category created successfully',
    data: createdCategory,
  };
}

async function update(id, payload) {
  await show(id);
  validatePayload(payload);

  const normalizedPayload = normalizePayload(payload);

  await validateRelations(normalizedPayload);
  await CategoryModel.update(id, normalizedPayload);

  const updatedCategory = await CategoryModel.findById(id);

  return {
    message: 'Category updated successfully',
    data: updatedCategory,
  };
}

async function destroy(id) {
  await show(id);
  await CategoryModel.remove(id);

  return {
    message: 'Category deleted successfully',
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};