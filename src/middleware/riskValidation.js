const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const VALID_STATUSES = ['IDENTIFIED', 'ANALYZED', 'MITIGATING', 'MONITORING', 'CLOSED', 'ESCALATED'];
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_RESPONSE_STRATEGIES = ['AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT'];
const VALID_MITIGATION_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const VALID_EFFECTIVENESS = ['LOW', 'MEDIUM', 'HIGH'];

// --- Risk validators ---

const validateCreateRisk = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('probability')
    .notEmpty().withMessage('Probability is required')
    .isFloat({ min: 0, max: 1 }).withMessage('Probability must be between 0 and 1'),
  body('impact')
    .notEmpty().withMessage('Impact is required')
    .isFloat({ min: 0, max: 1 }).withMessage('Impact must be between 0 and 1'),
  body('projectId')
    .notEmpty().withMessage('Project ID is required')
    .isUUID().withMessage('Project ID must be a valid UUID'),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('severity')
    .optional()
    .isIn(VALID_SEVERITIES).withMessage(`Severity must be one of: ${VALID_SEVERITIES.join(', ')}`),
  body('responseStrategy')
    .optional()
    .isIn(VALID_RESPONSE_STRATEGIES).withMessage(`Response strategy must be one of: ${VALID_RESPONSE_STRATEGIES.join(', ')}`),
  body('taskId')
    .optional()
    .isUUID().withMessage('Task ID must be a valid UUID'),
  body('categoryId')
    .optional()
    .isUUID().withMessage('Category ID must be a valid UUID'),
  body('owner')
    .optional()
    .isUUID().withMessage('Owner must be a valid UUID'),
  body('identifiedBy')
    .optional()
    .isUUID().withMessage('identifiedBy must be a valid UUID'),
  handleValidationErrors
];

const validateUpdateRisk = [
  param('id')
    .isUUID().withMessage('Risk ID must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),
  body('probability')
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage('Probability must be between 0 and 1'),
  body('impact')
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage('Impact must be between 0 and 1'),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('severity')
    .optional()
    .isIn(VALID_SEVERITIES).withMessage(`Severity must be one of: ${VALID_SEVERITIES.join(', ')}`),
  body('responseStrategy')
    .optional()
    .isIn(VALID_RESPONSE_STRATEGIES).withMessage(`Response strategy must be one of: ${VALID_RESPONSE_STRATEGIES.join(', ')}`),
  body('owner')
    .optional()
    .isUUID().withMessage('Owner must be a valid UUID'),
  handleValidationErrors
];

const validateUpdateStatus = [
  param('id')
    .isUUID().withMessage('Risk ID must be a valid UUID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  handleValidationErrors
];

const validateAssessRisk = [
  param('id')
    .isUUID().withMessage('Risk ID must be a valid UUID'),
  body('probability')
    .notEmpty().withMessage('Probability is required')
    .isFloat({ min: 0, max: 1 }).withMessage('Probability must be between 0 and 1'),
  body('impact')
    .notEmpty().withMessage('Impact is required')
    .isFloat({ min: 0, max: 1 }).withMessage('Impact must be between 0 and 1'),
  handleValidationErrors
];

const validateEscalateRisk = [
  param('id')
    .isUUID().withMessage('Risk ID must be a valid UUID'),
  body('escalatedTo')
    .notEmpty().withMessage('escalatedTo user ID is required')
    .isUUID().withMessage('escalatedTo must be a valid UUID'),
  body('notes')
    .optional()
    .trim(),
  handleValidationErrors
];

// --- Mitigation validators ---

const validateCreateMitigation = [
  body('riskId')
    .notEmpty().withMessage('Risk ID is required')
    .isUUID().withMessage('Risk ID must be a valid UUID'),
  body('strategy')
    .trim()
    .notEmpty().withMessage('Strategy is required')
    .isLength({ max: 255 }).withMessage('Strategy must not exceed 255 characters'),
  body('action')
    .trim()
    .notEmpty().withMessage('Action is required'),
  body('responsible')
    .optional()
    .isUUID().withMessage('Responsible user ID must be a valid UUID'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
  body('status')
    .optional()
    .isIn(VALID_MITIGATION_STATUSES).withMessage(`Status must be one of: ${VALID_MITIGATION_STATUSES.join(', ')}`),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),
  body('effectiveness')
    .optional()
    .isIn(VALID_EFFECTIVENESS).withMessage(`Effectiveness must be one of: ${VALID_EFFECTIVENESS.join(', ')}`),
  handleValidationErrors
];

const validateUpdateMitigation = [
  param('id')
    .isUUID().withMessage('Mitigation ID must be a valid UUID'),
  body('strategy')
    .optional()
    .trim()
    .notEmpty().withMessage('Strategy cannot be empty')
    .isLength({ max: 255 }).withMessage('Strategy must not exceed 255 characters'),
  body('action')
    .optional()
    .trim()
    .notEmpty().withMessage('Action cannot be empty'),
  body('responsible')
    .optional()
    .isUUID().withMessage('Responsible user ID must be a valid UUID'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
  body('status')
    .optional()
    .isIn(VALID_MITIGATION_STATUSES).withMessage(`Status must be one of: ${VALID_MITIGATION_STATUSES.join(', ')}`),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),
  body('effectiveness')
    .optional()
    .isIn(VALID_EFFECTIVENESS).withMessage(`Effectiveness must be one of: ${VALID_EFFECTIVENESS.join(', ')}`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCreateRisk,
  validateUpdateRisk,
  validateUpdateStatus,
  validateAssessRisk,
  validateEscalateRisk,
  validateCreateMitigation,
  validateUpdateMitigation
};
