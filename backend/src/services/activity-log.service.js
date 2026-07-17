const ActivityLogModel = require('../models/activity-log.model');
const DirectoryService = require('./pilargroup-directory.service');

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

function attachUsers(activityLogs, users) {
  const userMap = new Map(users.map((user) => [String(user.id), user]));

  return activityLogs.map((activityLog) => {
    if (!activityLog.user_id) {
      return {
        ...activityLog,
        user: null,
      };
    }

    const user = userMap.get(String(activityLog.user_id));

    return {
      ...activityLog,
      user: user
        ? {
            id: user.id,
            username: user.username || null,
            name: user.name || null,
            email: user.email || null,
          }
        : {
            id: activityLog.user_id,
            username: null,
            name: null,
            email: null,
          },
    };
  });
}

function matchesSearch(activityLog, search) {
  const needle = String(search || '').trim().toLowerCase();
  if (!needle) return true;

  return [
    activityLog.description,
    activityLog.entity_type,
    activityLog.entity_id,
    activityLog.action,
    activityLog.user?.name,
    activityLog.user?.username,
  ].some((value) => String(value ?? '').toLowerCase().includes(needle));
}

async function enrichActivityLogs(activityLogs) {
  if (!activityLogs.length) return activityLogs;

  const userIds = [
    ...new Set(activityLogs.map((row) => row.user_id).filter(Boolean)),
  ];

  if (!userIds.length) {
    return attachUsers(activityLogs, []);
  }

  const users = await DirectoryService.getUsers();
  const matchedUsers = DirectoryService.findUsersByIds(users, userIds);

  return attachUsers(activityLogs, matchedUsers);
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
  if (!query.search) {
    const result = await ActivityLogModel.findAll(query);
    result.data = await enrichActivityLogs(result.data);
    return result;
  }

  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 10, 10), 1), 100);
  const allRows = await ActivityLogModel.findAllForSearch(query);
  const enrichedRows = await enrichActivityLogs(allRows);
  const filteredRows = enrichedRows.filter((row) => matchesSearch(row, query.search));
  const offset = (page - 1) * limit;
  const total = filteredRows.length;

  return {
    data: filteredRows.slice(offset, offset + limit),
    meta: {
      page,
      limit,
      total,
      total_page: Math.ceil(total / limit),
    },
  };
}

async function show(id) {
  const activityLog = await ActivityLogModel.findById(id);

  if (!activityLog) {
    throw makeError('Activity log not found', 404, 'ACTIVITY_LOG_NOT_FOUND');
  }

  const [enrichedActivityLog] = await enrichActivityLogs([activityLog]);
  return enrichedActivityLog;
}

module.exports = {
  log,
  index,
  show,
};
