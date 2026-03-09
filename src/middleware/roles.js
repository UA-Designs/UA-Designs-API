/**
 * RBAC Role Definitions for UA Designs PMS
 *
 * Three operational tiers:
 *   Project Manager — full write/approve authority over all project modules
 *   Engineer        — write access for task updates, resource/cost data input
 *   Staff           — read-only everywhere; write access to communications only
 *
 * ADMIN retains unrestricted access across all tiers.
 */

// ── Role strings (must match User model ENUM) ──────────────────────────────
const ROLES = {
  ADMIN:           'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  ARCHITECT:       'ARCHITECT',
  ENGINEER:        'ENGINEER',
  STAFF:           'STAFF',
};

// ── Cumulative access levels (use these on routes) ───────────────────────────
const ACCESS_LEVELS = {
  /** System administration actions — ADMIN only */
  ADMIN_ONLY: [ROLES.ADMIN],

  /** Project management decisions — ADMIN + Project Manager + Architect */
  MANAGER_AND_ABOVE: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.ARCHITECT],

  /** Operational data entry — ADMIN + Project Manager + Architect + Engineer */
  ENGINEER_AND_ABOVE: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.ARCHITECT, ROLES.ENGINEER],

  /** Any authenticated user */
  ALL_ROLES: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.ARCHITECT, ROLES.ENGINEER, ROLES.STAFF],
};

module.exports = { ROLES, ACCESS_LEVELS };
