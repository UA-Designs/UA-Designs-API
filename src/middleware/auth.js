const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
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

// UA Designs specific role checks
const isCivilEngineer = (req, res, next) => {
  if (req.user.role === 'CIVIL_ENGINEER') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Civil Engineer access required'
    });
  }
};

const isArchitect = (req, res, next) => {
  if (req.user.role === 'ARCHITECT') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Architect access required'
    });
  }
};

const isProjectManager = (req, res, next) => {
  if (req.user.role === 'PROJECT_MANAGER') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Project Manager access required'
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermission,
  isCivilEngineer,
  isArchitect,
  isProjectManager,
  isAdmin
}; 