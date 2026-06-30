const crypto = require('crypto');
const ItemParentModel = require('../../models/item/item-parent.model');
const ActivityLogService = require('../activity-log.service');

const ALLOWED_STATUS = ['draft', 'active', 'inactive', 'discontinued'];

const STRING_LIMITS = {
  parent_code: 50,
  brand_id: 36,
  sub_brand: 100,
  item_name: 255,
  category_id: 36,
  item_type_id: 36,
  port_id: 36,
  parent_name: 255,
  status: 20,
};

function generateUuid() {
  return crypto.randomUUID();
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function validateRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateMaxLength(errors, payload, field, maxLength, label) {
  if (!hasValue(payload[field])) {
    return;
  }

  if (String(payload[field]).length > maxLength) {
    errors[field] = `${label} cannot be longer than ${maxLength} characters`;
  }
}

function validateNullableIdLength(errors, payload, field, maxLength, label) {
  if (!hasValue(payload[field])) {
    return;
  }

  if (String(payload[field]).length > maxLength) {
    errors[field] = `${label} is invalid`;
  }
}

function validatePayload(payload = {}, mode = 'create') {
  const errors = {};

  if (!validateRequired(payload.brand_id)) {
    errors.brand_id = 'Brand is required';
  }

  if (!validateRequired(payload.item_name)) {
    errors.item_name = 'Item name is required';
  }

  if (!validateRequired(payload.category_id)) {
    errors.category_id = 'Category is required';
  }

  if (!validateRequired(payload.parent_name)) {
    errors.parent_name = 'Parent name is required';
  }

  if (payload.status && !ALLOWED_STATUS.includes(payload.status)) {
    errors.status = `Status must be one of: ${ALLOWED_STATUS.join(', ')}`;
  }

  if (mode === 'update' && !validateRequired(payload.status)) {
    errors.status = 'Status is required';
  }

  if (payload.parent_code !== undefined) {
    errors.parent_code = 'Parent code is auto generated and cannot be sent from request';
  }

  validateNullableIdLength(errors, payload, 'brand_id', STRING_LIMITS.brand_id, 'Brand');
  validateNullableIdLength(errors, payload, 'category_id', STRING_LIMITS.category_id, 'Category');
  validateNullableIdLength(errors, payload, 'item_type_id', STRING_LIMITS.item_type_id, 'Item type');
  validateNullableIdLength(errors, payload, 'port_id', STRING_LIMITS.port_id, 'Port');

  validateMaxLength(errors, payload, 'sub_brand', STRING_LIMITS.sub_brand, 'Sub brand');
  validateMaxLength(errors, payload, 'item_name', STRING_LIMITS.item_name, 'Item name');
  validateMaxLength(errors, payload, 'parent_name', STRING_LIMITS.parent_name, 'Parent name');
  validateMaxLength(errors, payload, 'status', STRING_LIMITS.status, 'Status');

  return errors;
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function generateNextParentCode(lastParentCode) {
  if (!lastParentCode) {
    return 'P000001';
  }

  const lastNumber = parseInt(String(lastParentCode).replace('P', ''), 10) || 0;
  const nextNumber = lastNumber + 1;

  return `P${String(nextNumber).padStart(6, '0')}`;
}

async function validateReferences(payload, connection) {
  const errors = {};

  if (payload.brand_id) {
    const brandExists = await ItemParentModel.existsInTable(
      'master_brands',
      payload.brand_id,
      connection
    );

    if (!brandExists) {
      errors.brand_id = 'Brand not found';
    }
  }

  if (payload.category_id) {
    const categoryExists = await ItemParentModel.existsInTable(
      'master_categories',
      payload.category_id,
      connection
    );

    if (!categoryExists) {
      errors.category_id = 'Category not found';
    }
  }

  if (payload.item_type_id) {
    const itemTypeExists = await ItemParentModel.existsInTable(
      'master_item_types',
      payload.item_type_id,
      connection
    );

    if (!itemTypeExists) {
      errors.item_type_id = 'Item type not found';
    }
  }

  if (payload.port_id) {
    const portExists = await ItemParentModel.existsInTable(
      'master_ports',
      payload.port_id,
      connection
    );

    if (!portExists) {
      errors.port_id = 'Port not found';
    }
  }

  return errors;
}

async function getAll(query) {
  return ItemParentModel.findAll(query);
}

async function getById(id) {
  return ItemParentModel.findById(id);
}

async function create(payload, userId, req = null) {
  const payloadErrors = validatePayload(payload, 'create');

  if (hasErrors(payloadErrors)) {
    return {
      error: {
        type: 'validation',
        message: 'Validation failed',
        errors: payloadErrors,
      },
    };
  }

  return ItemParentModel.transaction(async (connection) => {
    const referenceErrors = await validateReferences(payload, connection);

    if (hasErrors(referenceErrors)) {
      return {
        error: {
          type: 'validation',
          message: 'Validation failed',
          errors: referenceErrors,
        },
      };
    }

    const lastParentCode = await ItemParentModel.findLastParentCode(connection);
    const parentCode = generateNextParentCode(lastParentCode);

    const data = {
      id: generateUuid(),
      parent_code: parentCode,
      brand_id: payload.brand_id,
      sub_brand: payload.sub_brand || null,
      item_name: payload.item_name,
      category_id: payload.category_id,
      item_type_id: payload.item_type_id || null,
      port_id: payload.port_id || null,
      parent_name: payload.parent_name,
      status: payload.status || 'active',
      created_by: userId,
      updated_by: userId,
    };

    const created = await ItemParentModel.create(data, connection);

    await ActivityLogService.log({
      user_id: userId,
      action: 'CREATE',
      entity_type: 'item_parents',
      entity_id: created.id,
      description: `Created item parent ${created.parent_code}`,
      before_data: null,
      after_data: created,
      metadata: {
        parent_code: created.parent_code,
        status: created.status,
      },
      req,
      connection,
    });

    return { data: created };
  });
}

async function update(id, payload, userId, req = null) {
  const existing = await ItemParentModel.findRawById(id);

  if (!existing) {
    return {
      error: {
        type: 'not_found',
        message: 'Item parent not found',
      },
    };
  }

  const mergedPayload = {
    brand_id: payload.brand_id ?? existing.brand_id,
    sub_brand: payload.sub_brand ?? existing.sub_brand,
    item_name: payload.item_name ?? existing.item_name,
    category_id: payload.category_id ?? existing.category_id,
    item_type_id: payload.item_type_id ?? existing.item_type_id,
    port_id: payload.port_id ?? existing.port_id,
    parent_name: payload.parent_name ?? existing.parent_name,
    status: payload.status ?? existing.status,
  };

  const payloadErrors = validatePayload(
    {
      ...mergedPayload,
      parent_code: payload.parent_code,
    },
    'update'
  );

  if (hasErrors(payloadErrors)) {
    return {
      error: {
        type: 'validation',
        message: 'Validation failed',
        errors: payloadErrors,
      },
    };
  }

  return ItemParentModel.transaction(async (connection) => {
    const referenceErrors = await validateReferences(mergedPayload, connection);

    if (hasErrors(referenceErrors)) {
      return {
        error: {
          type: 'validation',
          message: 'Validation failed',
          errors: referenceErrors,
        },
      };
    }

    const updated = await ItemParentModel.update(
      id,
      {
        ...mergedPayload,
        updated_by: userId,
      },
      connection
    );

    if (mergedPayload.status === 'inactive') {
      await ItemParentModel.deactivateChildItems(id, connection);
    }

    await ActivityLogService.log({
      user_id: userId,
      action: existing.status !== mergedPayload.status ? 'STATUS_CHANGE' : 'UPDATE',
      entity_type: 'item_parents',
      entity_id: updated.id,
      description: existing.status !== mergedPayload.status
        ? `Changed item parent ${updated.parent_code} status from ${existing.status} to ${mergedPayload.status}`
        : `Updated item parent ${updated.parent_code}`,
      before_data: existing,
      after_data: updated,
      metadata: {
        parent_code: updated.parent_code,
        old_status: existing.status,
        new_status: updated.status,
      },
      req,
      connection,
    });

    return { data: updated };
  });
}

module.exports = {
  getAll,
  getById,
  create,
  update,
};