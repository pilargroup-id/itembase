const BusinessUnitService = require('../../services/directory/business-unit.service');
const response = require('../../utils/response.util');

async function index(req, res, next) {
  try {
    const data = await BusinessUnitService.index(req.query);

    return response.ok(res, data, 'Business units retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function departments(req, res, next) {
  try {
    const data = await BusinessUnitService.departments(req.params.businessUnitId, req.query);

    return response.ok(res, data, 'Departments retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  index,
  departments,
};
