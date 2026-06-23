const BusinessUnitModel = require('../../models/directory/business-unit.model');

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function index(query) {
  return BusinessUnitModel.findAll({
    active: query.active,
    is_active: query.is_active,
    search: query.search,
  });
}

async function departments(businessUnitId, query) {
  if (!businessUnitId) {
    throw makeError('Business unit is required', 422, 'VALIDATION_ERROR');
  }

  return BusinessUnitModel.findDepartmentsByBusinessUnitId(businessUnitId, {
    active: query.active,
    is_active: query.is_active,
    search: query.search,
  });
}

module.exports = {
  index,
  departments,
};
