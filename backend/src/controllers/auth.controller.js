const R = require('../utils/response.util');

async function me(req, res, next) {
  try {
    return R.ok(res, req.user, 'Authenticated');
  } catch (err) {
    return next(err);
  }
}

module.exports = { me };