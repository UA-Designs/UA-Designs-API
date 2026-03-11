const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { AuditLog, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const adminOnly = [authenticateToken, authorizeRoles('ADMIN')];
const managerAndAbove = [authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER', 'ARCHITECT')];

// Helper: build a pagination meta object
function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// GET /api/audit/logs — ADMIN, PROJECT_MANAGER, ARCHITECT can view
// Query params: page, limit, userId, action, entity, startDate, endDate, sortOrder
router.get('/logs', ...managerAndAbove, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      userId,
      action,
      entity,
      startDate,
      endDate,
      sortOrder = 'DESC'
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset   = (pageNum - 1) * limitNum;

    const where = {};
    if (userId)    where.userId = userId;
    if (action)    where.action = action;
    if (entity)    where.entity = entity;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate)   where.createdAt[Op.lte] = new Date(endDate);
    }

    const order = [['createdAt', sortOrder === 'ASC' ? 'ASC' : 'DESC']];

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }],
      order,
      limit: limitNum,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      meta: buildMeta(count, pageNum, limitNum)
    });
  } catch (error) {
    console.error('GET /api/audit/logs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit/logs/user/:userId
router.get('/logs/user/:userId', ...managerAndAbove, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 25, sortOrder = 'DESC' } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset   = (pageNum - 1) * limitNum;

    const { count, rows } = await AuditLog.findAndCountAll({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }],
      order: [['createdAt', sortOrder === 'ASC' ? 'ASC' : 'DESC']],
      limit: limitNum,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      meta: buildMeta(count, pageNum, limitNum)
    });
  } catch (error) {
    console.error('GET /api/audit/logs/user/:userId error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user audit logs' });
  }
});

// GET /api/audit/logs/entity/:entity/:entityId
router.get('/logs/entity/:entity/:entityId', ...managerAndAbove, async (req, res) => {
  try {
    const { entity, entityId } = req.params;
    const { page = 1, limit = 25, sortOrder = 'DESC' } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset   = (pageNum - 1) * limitNum;

    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        entity: entity.toUpperCase(),
        entityId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }],
      order: [['createdAt', sortOrder === 'ASC' ? 'ASC' : 'DESC']],
      limit: limitNum,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      meta: buildMeta(count, pageNum, limitNum)
    });
  } catch (error) {
    console.error('GET /api/audit/logs/entity/:entity/:entityId error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch entity audit trail' });
  }
});

// GET /api/audit/logs/:id  — single entry (placed after named sub-routes to avoid conflicts)
router.get('/logs/:id', ...managerAndAbove, async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }]
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found' });
    }

    return res.json({ success: true, data: log });
  } catch (error) {
    console.error('GET /api/audit/logs/:id error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit log entry' });
  }
});

module.exports = router;
