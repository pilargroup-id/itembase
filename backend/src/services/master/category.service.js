const CategoryModel = require('../../models/master/category.model');

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizePayload(payload) {
  return {
    detail_category: String(payload.detail_category).trim(),
    sub_category: String(payload.sub_category).trim(),
    main_category: String(payload.main_category).trim(),
    brand_category: String(payload.brand_category).trim(),
    pic_id: payload.pic_id || null,
    is_active: payload.is_active ?? 1,
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function validateRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isValidBoolean(value) {
  return [0, 1, '0', '1', true, false].includes(value);
}

function validatePayload(payload) {
  const errors = {};

  if (!validateRequired(payload.detail_category)) {
    errors.detail_category = 'Detail category is required';
  }

  if (!validateRequired(payload.sub_category)) {
    errors.sub_category = 'Sub category is required';
  }

  if (!validateRequired(payload.main_category)) {
    errors.main_category = 'Main category is required';
  }

  if (!validateRequired(payload.brand_category)) {
    errors.brand_category = 'Brand category is required';
  }

  if (hasValue(payload.detail_category) && String(payload.detail_category).length > 150) {
    errors.detail_category = 'Detail category cannot be longer than 150 characters';
  }

  if (hasValue(payload.sub_category) && String(payload.sub_category).length > 100) {
    errors.sub_category = 'Sub category cannot be longer than 100 characters';
  }

  if (hasValue(payload.main_category) && String(payload.main_category).length > 100) {
    errors.main_category = 'Main category cannot be longer than 100 characters';
  }

  if (hasValue(payload.brand_category) && String(payload.brand_category).length > 100) {
    errors.brand_category = 'Brand category cannot be longer than 100 characters';
  }

  if (hasValue(payload.pic_id) && String(payload.pic_id).length > 36) {
    errors.pic_id = 'PIC is invalid';
  }

  if (hasValue(payload.is_active) && !isValidBoolean(payload.is_active)) {
    errors.is_active = 'Is active must be 0 or 1';
  }

  if (Object.keys(errors).length) {
    throw makeError('Validation failed', 422, 'VALIDATION_ERROR', errors);
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

  const usedCount = await CategoryModel.countUsedByItemParents(id);

  if (usedCount > 0) {
    throw makeError('Category is already used by item parents', 409, 'MASTER_DATA_IN_USE');
  }

  await CategoryModel.remove(id);

  return {
    message: 'Category deleted successfully',
  };
}

async function updateStatus(id, is_active) {
  await show(id);

  if (!isValidBoolean(is_active)) {
    throw makeError('is_active must be 0 or 1', 422, 'VALIDATION_ERROR');
  }

  await CategoryModel.updateStatus(id, Number(is_active));

  const updatedCategory = await CategoryModel.findById(id);

  return {
    message: 'Category status updated successfully',
    data: updatedCategory,
  };
}

module.exports = {
  index,
  show,
  store,
  update,
  updateStatus,
  destroy,
};