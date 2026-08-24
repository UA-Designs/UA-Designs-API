const { param, query, body } = require('express-validator');
const { handleValidationErrors } = require('./riskValidation');
const { SCENARIO_TYPES } = require('../services/Forecast/scenarioService');

const projectIdParam = param('projectId')
  .isUUID().withMessage('projectId must be a valid UUID');

const validateProjectId = [
  projectIdParam,
  handleValidationErrors
];

const validateGenerate = [
  projectIdParam,
  query('persist').optional().isBoolean().withMessage('persist must be a boolean'),
  handleValidationErrors
];

const validateScenario = [
  projectIdParam,
  body('scenarioType')
    .exists({ checkFalsy: true }).withMessage('scenarioType is required')
    .isString()
    .custom((value) => {
      const type = String(value).toUpperCase();
      if (!SCENARIO_TYPES.includes(type)) {
        throw new Error(`scenarioType must be one of: ${SCENARIO_TYPES.join(', ')}`);
      }
      return true;
    }),
  body('workersToAdd').optional().isFloat({ min: 0 }).withMessage('workersToAdd must be a non-negative number'),
  body('taskId').optional().isUUID().withMessage('taskId must be a valid UUID'),
  body('delayDays').optional().isFloat().withMessage('delayDays must be a number'),
  body('percent').optional().isFloat().withMessage('percent must be a number'),
  handleValidationErrors
];

module.exports = {
  validateProjectId,
  validateGenerate,
  validateScenario
};
