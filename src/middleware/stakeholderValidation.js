const { body, param, validationResult } = require('express-validator');

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

const VALID_TYPES = ['INTERNAL', 'EXTERNAL'];
const VALID_INFLUENCE = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_INTEREST = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_ENGAGEMENT_LEVELS = ['UNAWARE', 'RESISTANT', 'NEUTRAL', 'SUPPORTIVE', 'LEADING'];
const VALID_COMM_PREFERENCES = ['EMAIL', 'PHONE', 'IN_PERSON', 'REPORT'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];
const VALID_COMM_TYPES = ['EMAIL', 'MEETING', 'PHONE_CALL', 'REPORT', 'SITE_VISIT', 'LETTER'];
const VALID_DIRECTIONS = ['INBOUND', 'OUTBOUND'];
const VALID_COMM_STATUSES = ['DRAFT', 'SENT', 'RECEIVED', 'ACKNOWLEDGED'];

// --- Stakeholder validators ---

const validateCreateStakeholder = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
  body('projectId')
    .notEmpty().withMessage('Project ID is required')
    .isUUID().withMessage('Project ID must be a valid UUID'),
  body('userId')
    .optional()
    .isUUID().withMessage('User ID must be a valid UUID'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be a valid email address'),
  body('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
  body('influence')
    .optional()
    .isIn(VALID_INFLUENCE).withMessage(`Influence must be one of: ${VALID_INFLUENCE.join(', ')}`),
  body('interest')
    .optional()
    .isIn(VALID_INTEREST).withMessage(`Interest must be one of: ${VALID_INTEREST.join(', ')}`),
  body('engagementLevel')
    .optional()
    .isIn(VALID_ENGAGEMENT_LEVELS).withMessage(`Engagement level must be one of: ${VALID_ENGAGEMENT_LEVELS.join(', ')}`),
  body('communicationPreference')
    .optional()
    .isIn(VALID_COMM_PREFERENCES).withMessage(`Communication preference must be one of: ${VALID_COMM_PREFERENCES.join(', ')}`),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  handleValidationErrors
];

const validateUpdateStakeholder = [
  param('id')
    .isUUID().withMessage('Stakeholder ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
  body('userId')
    .optional()
    .isUUID().withMessage('User ID must be a valid UUID'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be a valid email address'),
  body('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
  body('influence')
    .optional()
    .isIn(VALID_INFLUENCE).withMessage(`Influence must be one of: ${VALID_INFLUENCE.join(', ')}`),
  body('interest')
    .optional()
    .isIn(VALID_INTEREST).withMessage(`Interest must be one of: ${VALID_INTEREST.join(', ')}`),
  body('engagementLevel')
    .optional()
    .isIn(VALID_ENGAGEMENT_LEVELS).withMessage(`Engagement level must be one of: ${VALID_ENGAGEMENT_LEVELS.join(', ')}`),
  body('communicationPreference')
    .optional()
    .isIn(VALID_COMM_PREFERENCES).withMessage(`Communication preference must be one of: ${VALID_COMM_PREFERENCES.join(', ')}`),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  handleValidationErrors
];

// --- Communication validators ---

const validateCreateCommunication = [
  body('type')
    .notEmpty().withMessage('Communication type is required')
    .isIn(VALID_COMM_TYPES).withMessage(`Type must be one of: ${VALID_COMM_TYPES.join(', ')}`),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ max: 255 }).withMessage('Subject must not exceed 255 characters'),
  body('message')
    .optional()
    .trim(),
  body('direction')
    .optional()
    .isIn(VALID_DIRECTIONS).withMessage(`Direction must be one of: ${VALID_DIRECTIONS.join(', ')}`),
  body('status')
    .optional()
    .isIn(VALID_COMM_STATUSES).withMessage(`Status must be one of: ${VALID_COMM_STATUSES.join(', ')}`),
  body('sentDate')
    .optional()
    .isISO8601().withMessage('Sent date must be a valid ISO 8601 date'),
  body('followUpDate')
    .optional()
    .isISO8601().withMessage('Follow-up date must be a valid ISO 8601 date'),
  body('sentBy')
    .optional()
    .isUUID().withMessage('Sent by must be a valid UUID'),
  handleValidationErrors
];

const validateUpdateCommunication = [
  param('commId')
    .isUUID().withMessage('Communication ID must be a valid UUID'),
  body('type')
    .optional()
    .isIn(VALID_COMM_TYPES).withMessage(`Type must be one of: ${VALID_COMM_TYPES.join(', ')}`),
  body('subject')
    .optional()
    .trim()
    .notEmpty().withMessage('Subject cannot be empty')
    .isLength({ max: 255 }).withMessage('Subject must not exceed 255 characters'),
  body('direction')
    .optional()
    .isIn(VALID_DIRECTIONS).withMessage(`Direction must be one of: ${VALID_DIRECTIONS.join(', ')}`),
  body('status')
    .optional()
    .isIn(VALID_COMM_STATUSES).withMessage(`Status must be one of: ${VALID_COMM_STATUSES.join(', ')}`),
  body('sentDate')
    .optional()
    .isISO8601().withMessage('Sent date must be a valid ISO 8601 date'),
  body('followUpDate')
    .optional()
    .isISO8601().withMessage('Follow-up date must be a valid ISO 8601 date'),
  handleValidationErrors
];

// --- Engagement validators ---

const validateRecordEngagement = [
  param('id')
    .isUUID().withMessage('Stakeholder ID must be a valid UUID'),
  body('engagementLevel')
    .notEmpty().withMessage('Engagement level is required')
    .isIn(VALID_ENGAGEMENT_LEVELS).withMessage(`Engagement level must be one of: ${VALID_ENGAGEMENT_LEVELS.join(', ')}`),
  body('satisfaction')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Satisfaction must be an integer between 1 and 10'),
  body('feedback')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim(),
  body('assessedBy')
    .optional()
    .isUUID().withMessage('Assessed by must be a valid UUID'),
  handleValidationErrors
];

const validateSubmitFeedback = [
  param('id')
    .isUUID().withMessage('Stakeholder ID must be a valid UUID'),
  body('feedback')
    .trim()
    .notEmpty().withMessage('Feedback is required'),
  body('satisfaction')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Satisfaction must be an integer between 1 and 10'),
  body('engagementLevel')
    .optional()
    .isIn(VALID_ENGAGEMENT_LEVELS).withMessage(`Engagement level must be one of: ${VALID_ENGAGEMENT_LEVELS.join(', ')}`),
  handleValidationErrors
];

module.exports = {
  validateCreateStakeholder,
  validateUpdateStakeholder,
  validateCreateCommunication,
  validateUpdateCommunication,
  validateRecordEngagement,
  validateSubmitFeedback
};
