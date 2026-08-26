const UserService = require('../../services/directory/user.service');
const response = require('../../utils/response.util');

async function productUsers(req, res, next) {
  try {
    const data = await UserService.productUsers(req.query);

    return response.ok(res, data, 'Product department users retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  productUsers,
};
