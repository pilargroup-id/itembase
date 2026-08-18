const InactiveItemModel = require('../../models/item-data/inactive-item.model');

function makeError(message) {
  return Object.assign(new Error(message), { statusCode: 422 });
}

function validateDate(value, field) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw makeError(`${field} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw makeError(`${field} is invalid`);
  }

  return text;
}

async function index(query = {}) {
  const dateFrom = validateDate(query.date_from, 'date_from');
  const dateTo = validateDate(query.date_to, 'date_to');

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw makeError('date_from cannot be greater than date_to');
  }

  return InactiveItemModel.findInactiveItems({
    ...query,
    date_from: dateFrom,
    date_to: dateTo,
  });
}

module.exports = {
  index,
};
