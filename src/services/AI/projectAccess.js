const { Project } = require('../../models');
const { ACCESS_LEVELS } = require('../../middleware/roles');
const { notFound, unauthorized } = require('./aiErrors');

const ADMIN_ROLES = ACCESS_LEVELS.ADMIN_ONLY.map((role) => String(role).toUpperCase());
const ENGINEER_ROLES = ACCESS_LEVELS.ENGINEER_AND_ABOVE.map((role) => String(role).toUpperCase());
const MANAGER_ROLES = ACCESS_LEVELS.MANAGER_AND_ABOVE.map((role) => String(role).toUpperCase());

function roleOf(user) {
  return user && user.role ? String(user.role).toUpperCase() : '';
}

function hasRole(user, allowed) {
  return allowed.includes(roleOf(user));
}

function isAdmin(user) {
  return hasRole(user, ADMIN_ROLES);
}

function canProposeWrites(user) {
  return hasRole(user, ENGINEER_ROLES);
}

function canManageTasks(user) {
  return hasRole(user, MANAGER_ROLES);
}

function canApplySchedule(user) {
  return hasRole(user, MANAGER_ROLES);
}

function canScoreRisks(user) {
  return hasRole(user, ENGINEER_ROLES);
}

/**
 * Backend is the authority for project access. The LLM never decides this.
 * Read access matches the rest of the API: any authenticated user may view
 * a project that exists. Write tools apply role checks separately.
 */
async function assertProjectAccess(user, projectId) {
  if (!user) throw unauthorized();
  const project = await Project.findByPk(projectId);
  if (!project) throw notFound();
  return project;
}

module.exports = {
  assertProjectAccess,
  isAdmin,
  canProposeWrites,
  canManageTasks,
  canApplySchedule,
  canScoreRisks,
  hasRole,
  MANAGER_ROLES,
  ENGINEER_ROLES
};
