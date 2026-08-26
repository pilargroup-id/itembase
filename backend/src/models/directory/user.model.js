const DirectoryService = require('../../services/pilargroup-directory.service');

const PRODUCT_DEPARTMENT_ID = 13;

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function matchesSearch(item, search, fields) {
  if (!hasValue(search)) return true;

  const needle = String(search).trim().toLowerCase();
  return fields.some((field) =>
    String(item[field] ?? '').toLowerCase().includes(needle)
  );
}

async function findProductUsers({ active, is_active, search } = {}) {
  const activeFilter = hasValue(active) ? active : is_active;
  const users = await DirectoryService.getUsers();

  return users
    .filter((user) => Number(user.department_id) === PRODUCT_DEPARTMENT_ID)
    .filter((user) => matchesSearch(user, search, ['username', 'name', 'email']))
    .filter((user) =>
      hasValue(activeFilter)
        ? Number(user.is_active) === Number(activeFilter)
        : true
    )
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      job_position: user.job_position,
      department_id: user.department_id,
      department_name: user.department_name,
      department_code: user.department_code,
      is_active: user.is_active,
    }));
}

module.exports = {
  findProductUsers,
};
