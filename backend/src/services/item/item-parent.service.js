const crypto = require('crypto');
const ItemParentModel = require('../../models/item/item-parent.model');
const ActivityLogService = require('../activity-log.service');

const ALLOWED_STATUS = ['draft', 'active', 'inactive', 'discontinued'];

const STRING_LIMITS = {
  parent_code: 50,
  subbrand_id: 36,
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

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function trimOrNull(value) {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();

  return trimmed === '' ? null : trimmed;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
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

  validateNullableIdLength(errors, payload, 'subbrand_id', STRING_LIMITS.subbrand_id, 'Subbrand');
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

  if (payload.subbrand_id) {
    const subbrandExists = await ItemParentModel.existsInTable(
      'master_subbrands',
      payload.subbrand_id,
      connection
    );

    if (!subbrandExists) {
      errors.subbrand_id = 'Subbrand not found';
    }
  }

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

async function resolveSubbrand(payload, connection) {
  const subbrandId = trimOrNull(payload.subbrand_id);
  const subbrandName = trimOrNull(payload.sub_brand);

  if (subbrandId) {
    const existing = await ItemParentModel.findSubbrandById(subbrandId, connection);

    if (!existing) {
      return {
        error: {
          type: 'validation',
          message: 'Validation failed',
          errors: {
            subbrand_id: 'Subbrand not found',
          },
        },
      };
    }

    return {
      data: {
        id: existing.id,
        name: subbrandName || existing.name,
      },
    };
  }

  if (!subbrandName) {
    return {
      data: null,
    };
  }

  const existingByName = await ItemParentModel.findSubbrandByName(subbrandName, connection);

  if (existingByName) {
    return {
      data: {
        id: existingByName.id,
        name: existingByName.name,
      },
    };
  }

  const created = await ItemParentModel.createSubbrand(
    {
      name: subbrandName,
      normalized_name: normalizeText(subbrandName),
    },
    connection
  );

  return {
    data: {
      id: created.id,
      name: created.name,
    },
  };
}

async function syncSubbrandItem(itemParent, connection) {
  if (!itemParent?.subbrand_id || !itemParent?.parent_name) {
    return;
  }

  await ItemParentModel.upsertSubbrandItem(
    {
      subbrand_id: itemParent.subbrand_id,
      item_parent_id: itemParent.id,
      item_name: itemParent.parent_name,
      normalized_item_name: normalizeText(itemParent.parent_name),
    },
    connection
  );
}

function normalizeForSimilarity(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function levenshteinDistance(a, b) {
  const textA = normalizeForSimilarity(a);
  const textB = normalizeForSimilarity(b);

  if (!textA) return textB.length;
  if (!textB) return textA.length;

  const matrix = Array.from({ length: textA.length + 1 }, () =>
    new Array(textB.length + 1).fill(0)
  );

  for (let i = 0; i <= textA.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= textB.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= textA.length; i += 1) {
    for (let j = 1; j <= textB.length; j += 1) {
      const cost = textA[i - 1] === textB[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[textA.length][textB.length];
}

function lcsLength(a, b) {
  const textA = normalizeForSimilarity(a);
  const textB = normalizeForSimilarity(b);

  if (!textA || !textB) return 0;

  const previous = new Array(textB.length + 1).fill(0);
  const current = new Array(textB.length + 1).fill(0);

  for (let i = 1; i <= textA.length; i += 1) {
    for (let j = 1; j <= textB.length; j += 1) {
      if (textA[i - 1] === textB[j - 1]) {
        current[j] = previous[j - 1] + 1;
      } else {
        current[j] = Math.max(previous[j], current[j - 1]);
      }
    }

    for (let j = 0; j <= textB.length; j += 1) {
      previous[j] = current[j];
      current[j] = 0;
    }
  }

  return previous[textB.length];
}

function similarityPercentage(input, target) {
  const inputText = normalizeForSimilarity(input);
  const targetText = normalizeForSimilarity(target);

  if (!inputText || !targetText) return 0;

  if (inputText === targetText) {
    return 100;
  }

  const maxLength = Math.max(inputText.length, targetText.length);

  const distance = levenshteinDistance(inputText, targetText);
  const levenshteinScore = ((maxLength - distance) / maxLength) * 100;

  const lcsScore = (lcsLength(inputText, targetText) / maxLength) * 100;

  let bonus = 0;

  if (targetText.startsWith(inputText)) {
    bonus += 18;
  } else if (inputText.startsWith(targetText)) {
    bonus += 12;
  }

  if (targetText.includes(inputText)) {
    bonus += 15;
  }

  if (targetText[0] === inputText[0]) {
    bonus += 8;
  }

  if (targetText[targetText.length - 1] === inputText[inputText.length - 1]) {
    bonus += 4;
  }

  const lengthPenalty = Math.abs(targetText.length - inputText.length) * 2;

  const combinedScore = (
    levenshteinScore * 0.55
    + lcsScore * 0.45
    + bonus
    - lengthPenalty
  );

  const finalScore = Math.max(0, Math.min(100, combinedScore));

  return Number(finalScore.toFixed(2));
}

async function getAll(query) {
  return ItemParentModel.findAll(query);
}

async function getById(id) {
  return ItemParentModel.findById(id);
}

async function suggestSubbrands(query = {}) {
  const input = trimOrNull(query.input || query.search);
  const limit = Math.min(Math.max(parseInt(query.limit || 50, 10), 1), 200);
  const minScore = Math.min(
    Math.max(parseFloat(query.min_score || 35), 0),
    100
  );

  if (!input) {
    return [];
  }

  const rows = await ItemParentModel.findSubbrandSuggestionCandidates();

  return rows
    .map((row) => ({
      subbrand_id: row.subbrand_id,
      sub_brand: row.sub_brand,
      parent_name: row.parent_name,
      score: similarityPercentage(input, row.sub_brand),
    }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.sub_brand !== b.sub_brand) return a.sub_brand.localeCompare(b.sub_brand);
      return a.parent_name.localeCompare(b.parent_name);
    })
    .slice(0, limit);
}

async function create(payload, userId, req = null) {
  const normalizedPayload = {
    subbrand_id: trimOrNull(payload.subbrand_id),
    brand_id: trimOrNull(payload.brand_id),
    sub_brand: trimOrNull(payload.sub_brand),
    item_name: trimOrNull(payload.item_name),
    category_id: trimOrNull(payload.category_id),
    item_type_id: trimOrNull(payload.item_type_id),
    port_id: trimOrNull(payload.port_id),
    parent_name: trimOrNull(payload.parent_name),
    status: trimOrNull(payload.status) || 'active',
    parent_code: payload.parent_code,
  };

  const payloadErrors = validatePayload(normalizedPayload, 'create');

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
    const referenceErrors = await validateReferences(normalizedPayload, connection);

    if (hasErrors(referenceErrors)) {
      return {
        error: {
          type: 'validation',
          message: 'Validation failed',
          errors: referenceErrors,
        },
      };
    }

    const resolvedSubbrand = await resolveSubbrand(normalizedPayload, connection);

    if (resolvedSubbrand.error) {
      return resolvedSubbrand;
    }

    const lastParentCode = await ItemParentModel.findLastParentCode(connection);
    const parentCode = generateNextParentCode(lastParentCode);

    const data = {
      id: generateUuid(),
      subbrand_id: resolvedSubbrand.data?.id || null,
      parent_code: parentCode,
      brand_id: normalizedPayload.brand_id,
      sub_brand: resolvedSubbrand.data?.name || normalizedPayload.sub_brand,
      item_name: normalizedPayload.item_name,
      category_id: normalizedPayload.category_id,
      item_type_id: normalizedPayload.item_type_id,
      port_id: normalizedPayload.port_id,
      parent_name: normalizedPayload.parent_name,
      status: normalizedPayload.status,
      created_by: userId,
      updated_by: userId,
    };

    const created = await ItemParentModel.create(data, connection);

    await syncSubbrandItem(created, connection);

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
        subbrand_id: created.subbrand_id,
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
    subbrand_id: hasOwn(payload, 'subbrand_id') ? trimOrNull(payload.subbrand_id) : existing.subbrand_id,
    brand_id: hasOwn(payload, 'brand_id') ? trimOrNull(payload.brand_id) : existing.brand_id,
    sub_brand: hasOwn(payload, 'sub_brand') ? trimOrNull(payload.sub_brand) : existing.sub_brand,
    item_name: hasOwn(payload, 'item_name') ? trimOrNull(payload.item_name) : existing.item_name,
    category_id: hasOwn(payload, 'category_id') ? trimOrNull(payload.category_id) : existing.category_id,
    item_type_id: hasOwn(payload, 'item_type_id') ? trimOrNull(payload.item_type_id) : existing.item_type_id,
    port_id: hasOwn(payload, 'port_id') ? trimOrNull(payload.port_id) : existing.port_id,
    parent_name: hasOwn(payload, 'parent_name') ? trimOrNull(payload.parent_name) : existing.parent_name,
    status: hasOwn(payload, 'status') ? trimOrNull(payload.status) : existing.status,
    parent_code: payload.parent_code,
  };

  const payloadErrors = validatePayload(mergedPayload, 'update');

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

    const resolvedSubbrand = await resolveSubbrand(mergedPayload, connection);

    if (resolvedSubbrand.error) {
      return resolvedSubbrand;
    }

    const updated = await ItemParentModel.update(
      id,
      {
        ...mergedPayload,
        subbrand_id: resolvedSubbrand.data?.id || null,
        sub_brand: resolvedSubbrand.data?.name || mergedPayload.sub_brand,
        updated_by: userId,
      },
      connection
    );

    await syncSubbrandItem(updated, connection);

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
        subbrand_id: updated.subbrand_id,
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
  suggestSubbrands,
  create,
  update,
};