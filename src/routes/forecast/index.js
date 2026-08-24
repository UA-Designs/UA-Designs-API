const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const {
  validateProjectId,
  validateScenario
} = require('../../middleware/forecastValidation');
const ForecastController = require('../../controllers/Forecast/forecastController');

router.get('/health', (req, res) => ForecastController.getHealth(req, res));

router.get('/at-risk', authenticateToken, (req, res) => ForecastController.getAtRiskProjects(req, res));

router.get(
  '/projects/:projectId',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getProjectForecast(req, res)
);

router.get(
  '/projects/:projectId/cost',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getCostForecast(req, res)
);

router.get(
  '/projects/:projectId/schedule',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getScheduleForecast(req, res)
);

router.get(
  '/projects/:projectId/progress',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getProgressForecast(req, res)
);

router.get(
  '/projects/:projectId/resources',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getResourceForecast(req, res)
);

router.get(
  '/projects/:projectId/alerts',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getAlerts(req, res)
);

router.get(
  '/projects/:projectId/history',
  authenticateToken,
  validateProjectId,
  (req, res) => ForecastController.getHistory(req, res)
);

router.post(
  '/projects/:projectId/generate',
  authenticateToken,
  authorize('ENGINEER_AND_ABOVE'),
  validateProjectId,
  (req, res) => ForecastController.generateSnapshot(req, res)
);

router.post(
  '/projects/:projectId/scenarios',
  authenticateToken,
  authorize('ENGINEER_AND_ABOVE'),
  validateScenario,
  (req, res) => ForecastController.runScenario(req, res)
);

module.exports = router;
