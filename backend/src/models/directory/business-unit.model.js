const DirectoryService = require('../../services/pilargroup-directory.service');

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

async function findAll({ active, is_active, search } = {}) {
  const activeFilter = hasValue(active) ? active : is_active;
  const businessUnits = await DirectoryService.getBusinessUnits();

  return businessUnits
    .filter((businessUnit) =>
      matchesSearch(businessUnit, search, ['code', 'name'])
    )
    .filter((businessUnit) =>
      hasValue(activeFilter)
        ? Number(businessUnit.is_active) === Number(activeFilter)
        : true
    )
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((businessUnit) => ({
      id: businessUnit.id,
      code: businessUnit.code,
      name: businessUnit.name,
      is_active: businessUnit.is_active,
    }));
}

async function findDepartmentsByBusinessUnitId(
  businessUnitId,
  { active, is_active, search } = {}
) {
  const activeFilter = hasValue(active) ? active : is_active;
  const departments = await DirectoryService.getBusinessUnitDepartments(
    businessUnitId
  );

  return departments
    .filter((department) =>
      matchesSearch(department, search, [
        'department_code',
        'department_name',
      ])
    )
    .filter((department) =>
      hasValue(activeFilter)
        ? Number(department.is_active) === Number(activeFilter)
        : true
    )
    .sort((a, b) => {
      const primaryDiff = Number(b.is_primary) - Number(a.is_primary);
      if (primaryDiff !== 0) return primaryDiff;

      return String(a.department_name).localeCompare(
        String(b.department_name)
      );
    })
    .map((department) => ({
      business_unit_id: department.business_unit_id,
      department_id: department.department_id,
      department_code: department.department_code,
      department_name: department.department_name,
      is_primary: department.is_primary,
      is_active: department.is_active,
    }));
}

module.exports = {
  findAll,
  findDepartmentsByBusinessUnitId,
};
