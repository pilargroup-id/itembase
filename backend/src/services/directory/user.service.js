const UserModel = require('../../models/directory/user.model');

async function productUsers(query) {
  return UserModel.findProductUsers({
    active: query.active,
    is_active: query.is_active,
    search: query.search,
  });
}

module.exports = {
  productUsers,
};
