/**
 * Unified authorization middleware for UA Designs PMS.
 *
 * Replaces the scattered `authorizeRoles('ADMIN', 'PROJECT_MANAGER', ...)` calls
 * throughout route files with a single, named-level API.
 *
 * Usage:
 *   const { authorize } = require('../middleware/authorize');
 *
 *   // Named access level (preferred)
 *   router.post('/', authenticateToken, authorize('MANAGER_AND_ABOVE'), handler);
 *
 *   // Explicit role array (for one-off cases)
 *   router.delete('/', authenticateToken, authorize(['ADMIN']), handler);
 */

const { ACCESS_LEVELS } = require('./roles');

/**
 * Returns an Express middleware that allows only users whose role is included
 * in the given access level or explicit role array.
 *
 * @param {string|string[]} levelOrRoles
 *   A key of ACCESS_LEVELS (e.g. 'MANAGER_AND_ABOVE') OR an explicit string[]
 *   of role names.
 * @returns {import('express').RequestHandler}
 */
const authorize = (levelOrRoles) => {
  const allowed = Array.isArray(levelOrRoles)
    ? levelOrRoles
    : ACCESS_LEVELS[levelOrRoles];

  if (!allowed) {
    // Fail loudly at startup if an unknown level is referenced
    throw new Error(`[authorize] Unknown access level: "${levelOrRoles}". ` +
      `Valid levels are: ${Object.keys(ACCESS_LEVELS).join(', ')}`);
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this action',
      });
    }

    return next();
  };
};

/**
 * Returns an Express middleware that allows access when the requesting user is
 * either the resource owner OR holds a role in the given access level.
 *
 * `ownerFn` receives the current `req` and must return (or resolve to) the
 * owner's user ID. If the lookup throws, the ownership check is skipped and
 * only the role check applies.
 *
 * @param {string|string[]} levelOrRoles
 * @param {(req: import('express').Request) => Promise<string>|string} ownerFn
 * @returns {import('express').RequestHandler}
 */
const authorizeOwnerOr = (levelOrRoles, ownerFn) => {
  const allowed = Array.isArray(levelOrRoles)
    ? levelOrRoles
    : ACCESS_LEVELS[levelOrRoles];

  if (!allowed) {
    throw new Error(`[authorizeOwnerOr] Unknown access level: "${levelOrRoles}".`);
  }

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Ownership check
    try {
      const ownerId = await ownerFn(req);
      if (String(req.user.id) === String(ownerId)) {
        return next();
      }
    } catch (_) {
      // Ownership lookup failed — fall through to role check
    }

    if (allowed.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions for this action',
    });
  };
};

module.exports = { authorize, authorizeOwnerOr };
