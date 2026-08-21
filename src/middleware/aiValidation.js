const { body, param } = require('express-validator');
const { handleValidationErrors } = require('./riskValidation');

const projectIdValidator = body('projectId')
  .exists({ checkFalsy: true }).withMessage('projectId is required')
  .custom((value) => {
    if (typeof value === 'number' || typeof value === 'string') return true;
    throw new Error('projectId must be a number or string');
  });

const validateAiRiskScore = [
  projectIdValidator,
  handleValidationErrors
];

const validateAiChatRespond = [
  projectIdValidator,
  body('message')
    .exists({ checkFalsy: true }).withMessage('message is required')
    .isString().withMessage('message must be a string')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('message must be between 1 and 2000 characters'),
  body('conversationId')
    .optional({ nullable: true })
    .isUUID().withMessage('conversationId must be a valid UUID'),
  handleValidationErrors
];

const validateAiSchedulePropose = [
  projectIdValidator,
  body('startDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
  handleValidationErrors
];

const validateAiScheduleApply = [
  projectIdValidator,
  body('taskIds')
    .optional()
    .isArray().withMessage('taskIds must be an array of task IDs'),
  body('taskIds.*')
    .optional()
    .isUUID().withMessage('Each taskId must be a valid UUID'),
  handleValidationErrors
];

const validateAiActionDecision = [
  param('id')
    .exists({ checkFalsy: true }).withMessage('id is required')
    .isUUID().withMessage('id must be a valid UUID'),
  handleValidationErrors
];

module.exports = {
  validateAiRiskScore,
  validateAiChatRespond,
  validateAiSchedulePropose,
  validateAiScheduleApply,
  validateAiActionDecision
};
