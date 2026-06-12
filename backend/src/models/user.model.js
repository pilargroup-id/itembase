const { centralDb } = require('../config/database.config');

async function findByUsername(username) {
  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.phone,
       cu.name,
       cu.job_position,
       cu.is_active,
       cu.token_version,
       jl.name  AS job_level,
       jl.level AS job_level_value
     FROM central_users cu
     LEFT JOIN master_job_levels jl ON jl.id = cu.job_level_id
     WHERE cu.username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.phone,
       cu.name,
       cu.job_position,
       cu.is_active,
       cu.token_version,
       jl.name  AS job_level,
       jl.level AS job_level_value
     FROM central_users cu
     LEFT JOIN master_job_levels jl ON jl.id = cu.job_level_id
     WHERE cu.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findUserDepartments(userId) {
  const [rows] = await centralDb.query(
    `SELECT
       md.id,
       md.name,
       md.class,
       md.code,
       md.company_id,
       md.parent_id,
       cud.is_primary
     FROM central_user_departments cud
     INNER JOIN master_departments md ON md.id = cud.department_id
     WHERE cud.user_id = ?
       AND md.is_active = 1
     ORDER BY cud.is_primary DESC, md.name ASC`,
    [userId]
  );

  return rows;
}

async function findUserCompanies(userId) {
  const [rows] = await centralDb.query(
    `SELECT
       mc.id,
       mc.code,
       mc.name,
       cuc.is_primary
     FROM central_user_companies cuc
     INNER JOIN master_companies mc ON mc.id = cuc.company_id
     WHERE cuc.user_id = ?
       AND mc.is_active = 1
     ORDER BY cuc.is_primary DESC, mc.name ASC`,
    [userId]
  );

  return rows;
}

async function findUserProjects(userId) {
  const [rows] = await centralDb.query(
    `SELECT
       mp.id,
       mp.name,
       mp.slug,
       mp.url,
       mp.description
     FROM central_user_projects cup
     INNER JOIN master_projects mp ON mp.id = cup.project_id
     WHERE cup.user_id = ?
       AND mp.is_active = 1
     ORDER BY mp.name ASC`,
    [userId]
  );

  return rows;
}

async function findFullProfileById(id) {
  const user = await findById(id);

  if (!user) {
    return null;
  }

  const [departments, companies, projects] = await Promise.all([
    findUserDepartments(id),
    findUserCompanies(id),
    findUserProjects(id),
  ]);

  const primaryDepartment = departments.find((item) => Number(item.is_primary) === 1) || departments[0] || null;
  const primaryCompany = companies.find((item) => Number(item.is_primary) === 1) || companies[0] || null;

  return {
    id: user.id,
    internal_id: user.internal_id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    job_position: user.job_position,

    job_level: user.job_level,
    job_level_value: user.job_level_value,

    is_active: user.is_active,
    token_version: user.token_version,

    departments,
    companies,
    projects,

    apps: projects.map((project) => project.slug),

    department_id: primaryDepartment?.id || null,
    department: primaryDepartment?.name || null,
    department_class: primaryDepartment?.class || null,
    department_code: primaryDepartment?.code || null,

    company_id: primaryCompany?.id || null,
    company: primaryCompany?.name || null,
    company_code: primaryCompany?.code || null,

    cv: user.token_version,
  };
}

module.exports = {
  findByUsername,
  findById,
  findUserDepartments,
  findUserCompanies,
  findUserProjects,
  findFullProfileById,
};