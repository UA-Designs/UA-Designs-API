'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const analyticsController = require('../../controllers/Analytics/analyticsController');

// Global analytics overview — whole-company summary
router.get('/overview', authenticateToken, analyticsController.getOverview.bind(analyticsController));

// Per-project deep-dive analytics
router.get('/project/:projectId', authenticateToken, analyticsController.getProjectAnalytics.bind(analyticsController));

module.exports = router;
