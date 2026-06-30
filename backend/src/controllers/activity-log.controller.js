const response = require('../utils/response.util');
const ActivityLogService = require('../services/activity-log.service');

function handleError(res, error) {
  if (error.statusCode === 404) {
    return response.notFound(res, error.message);
  }

  if (error.statusCode === 401) {
    return response.unauthorized(res, error.message);
  }

  if (error.statusCode === 403) {
    return response.forbidden(res, error.message);
  }

  return response.badRequest(res, error.message || 'Request failed');
}

async function index(req, res) {
  try {
    const result = await ActivityLogService.index(req.query);

    return response.paginated(
      res,
      result.data,
      result.meta,
      'Activity logs retrieved successfully'
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function show(req, res) {
  try {
    const activityLog = await ActivityLogService.show(req.params.id);

    return response.ok(
      res,
      activityLog,
      'Activity log retrieved successfully'
    );
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  index,
  show,
};