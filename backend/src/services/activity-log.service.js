const ActivityLogModel = require('../models/activity-log.model');

const ALLOWED_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'SYNC',
  'STATUS_CHANGE',
];

function makeError(message, statusCode = 400, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getRequestMeta(req) {
  if (!req) {
    return {
      ip_address: null,
      user_agent: null,
    };
  }

  return {
    ip_address:
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null,
    user_agent: req.headers['user-agent'] || null,
  };
}

async function log({
  user_id,
  action,
  entity_type,
  entity_id,
  description,
  before_data,
  after_data,
  metadata,
  req,
  connection,
}) {
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw makeError('Invalid activity action', 422, 'INVALID_ACTIVITY_ACTION');
  }

  if (!entity_type) {
    throw makeError('Entity type is required', 422, 'VALIDATION_ERROR');
  }

  const requestMeta = getRequestMeta(req);

  return ActivityLogModel.create(
    {
      user_id,
      action,
      entity_type,
      entity_id,
      description,
      before_data,
      after_data,
      metadata,
      ip_address: requestMeta.ip_address,
      user_agent: requestMeta.user_agent,
    },
    connection
  );
}

async function index(query) {
  return ActivityLogModel.findAll(query);
}

async function show(id) {
  const activityLog = await ActivityLogModel.findById(id);

  if (!activityLog) {
    throw makeError('Activity log not found', 404, 'ACTIVITY_LOG_NOT_FOUND');
  }

  return activityLog;
}

module.exports = {
  log,
  index,
  show,
};