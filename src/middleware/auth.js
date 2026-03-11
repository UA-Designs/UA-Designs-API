const jwt = require('jsonwebtoken');
const { User } = require('../models');

// New RBAC middleware — prefer these over the legacy helpers below
// const { authorize, authorizeOwnerOr } = require('./authorize');
// const { ROLES, ROLE_GROUPS, ACCESS_LEVELS } = require('./roles');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ua-designs-secret-key');
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based authorization middleware (legacy — use authorize() from ./authorize instead)
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const isAdminLike = userRole === 'PROPRIETOR' && roles.includes('ADMIN');

    if (!roles.includes(userRole) && !isAdminLike) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const authorizePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.hasPermission(module, action)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions for ${module}:${action}`
      });
    }

    next();
  };
};

// Legacy role-specific middleware — use authorize() from middleware/authorize.js instead
const isProjectManager = (req, res, next) => {
  if (['PROJECT_MANAGER', 'ARCHITECT', 'ADMIN', 'PROPRIETOR'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Project Manager access required' });
  }
};

const isAdmin = (req, res, next) => {
  if (['ADMIN', 'PROPRIETOR'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermission,
  isProjectManager,
  isAdmin
}; 