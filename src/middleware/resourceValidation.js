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

const MATERIAL_STATUSES = ['ORDERED', 'IN_TRANSIT', 'DELIVERED', 'IN_USE', 'DEPLETED'];
const LABOR_STATUSES = ['AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'TERMINATED'];
const EQUIPMENT_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'];
const EQUIPMENT_CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];
const TEAM_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'];
const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const RESOURCE_TYPES = ['MATERIAL', 'LABOR', 'EQUIPMENT'];
const ALLOCATION_STATUSES = ['PLANNED', 'ALLOCATED', 'IN_USE', 'RELEASED', 'CANCELLED'];
const MAINTENANCE_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'];
const MAINTENANCE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// --- Material validators ---

// Normalize body so frontend can send either camelCase or snake_case
const normalizeMaterialCreateBody = (req, res, next) => {
  const b = req.body || {};
  if (!b.projectId && b.project_id) b.projectId = b.project_id;
  if (b.unitCost === undefined && b.unit_cost !== undefined) b.unitCost = b.unit_cost;
  if (b.deliveryDate === undefined && b.delivery_date !== undefined) b.deliveryDate = b.delivery_date;
  if (typeof b.unitCost === 'string') b.unitCost = parseFloat(String(b.unitCost).replace(/,/g, ''));
  if (typeof b.quantity === 'string') b.quantity = parseFloat(String(b.quantity).replace(/,/g, ''));
  next();
};

const validateCreateMaterial = [
  normalizeMaterialCreateBody,
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
  body('projectId')
    .optional({ nullable: true })
    .isUUID().withMessage('Project ID must be a valid UUID'),
  body('unit')
    .trim()
    .notEmpty().withMessage('Unit is required'),
  body('unitCost')
    .notEmpty().withMessage('Unit cost is required')
    .custom((v) => !isNaN(Number(v)) && Number(v) >= 0).withMessage('Unit cost must be a non-negative number'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .custom((v) => !isNaN(Number(v)) && Number(v) >= 0).withMessage('Quantity must be a non-negative number'),
  body('status')
    .optional()
    .isIn(MATERIAL_STATUSES).withMessage(`Status must be one of: ${MATERIAL_STATUSES.join(', ')}`),
  body('deliveryDate')
    .optional()
    .isISO8601().withMessage('Delivery date must be a valid date'),
  handleValidationErrors
];

const validateUpdateMaterial = [
  param('id').isUUID().withMessage('Material ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 255 }),
  body('unitCost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Unit cost must be a non-negative number'),
  body('quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('status')
    .optional()
    .isIn(MATERIAL_STATUSES).withMessage(`Status must be one of: ${MATERIAL_STATUSES.join(', ')}`),
  handleValidationErrors
];

// --- Labor validators ---

const validateCreateLabor = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }),
  body('projectId')
    .notEmpty().withMessage('Project ID is required')
    .isUUID().withMessage('Project ID must be a valid UUID'),
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required'),
  body('dailyRate')
    .notEmpty().withMessage('Daily rate is required')
    .isFloat({ min: 0 }).withMessage('Daily rate must be a non-negative number'),
  body('status')
    .optional()
    .isIn(LABOR_STATUSES).withMessage(`Status must be one of: ${LABOR_STATUSES.join(', ')}`),
  body('hoursWorked')
    .optional()
    .isFloat({ min: 0 }).withMessage('Hours worked must be a non-negative number'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  handleValidationErrors
];

const validateUpdateLabor = [
  param('id').isUUID().withMessage('Labor ID must be a valid UUID'),
  body('dailyRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Daily rate must be a non-negative number'),
  body('hoursWorked')
    .optional()
    .isFloat({ min: 0 }).withMessage('Hours worked must be a non-negative number'),
  body('status')
    .optional()
    .isIn(LABOR_STATUSES).withMessage(`Status must be one of: ${LABOR_STATUSES.join(', ')}`),
  handleValidationErrors
];

// --- Equipment validators ---

const validateCreateEquipment = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }),
  body('type')
    .trim()
    .notEmpty().withMessage('Equipment type is required'),
  body('status')
    .optional()
    .isIn(EQUIPMENT_STATUSES).withMessage(`Status must be one of: ${EQUIPMENT_STATUSES.join(', ')}`),
  body('condition')
    .optional()
    .isIn(EQUIPMENT_CONDITIONS).withMessage(`Condition must be one of: ${EQUIPMENT_CONDITIONS.join(', ')}`),
  body('dailyRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Daily rate must be a non-negative number'),
  body('projectId')
    .optional()
    .isUUID().withMessage('Project ID must be a valid UUID'),
  handleValidationErrors
];

const validateUpdateEquipment = [
  param('id').isUUID().withMessage('Equipment ID must be a valid UUID'),
  body('status')
    .optional()
    .isIn(EQUIPMENT_STATUSES).withMessage(`Status must be one of: ${EQUIPMENT_STATUSES.join(', ')}`),
  body('condition')
    .optional()
    .isIn(EQUIPMENT_CONDITIONS).withMessage(`Condition must be one of: ${EQUIPMENT_CONDITIONS.join(', ')}`),
  body('dailyRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Daily rate must be a non-negative number'),
  handleValidationErrors
];

const validateCreateMaintenance = [
  body('maintenanceType')
    .notEmpty().withMessage('Maintenance type is required')
    .isIn(MAINTENANCE_TYPES).withMessage(`Maintenance type must be one of: ${MAINTENANCE_TYPES.join(', ')}`),
  body('status')
    .optional()
    .isIn(MAINTENANCE_STATUSES).withMessage(`Status must be one of: ${MAINTENANCE_STATUSES.join(', ')}`),
  body('scheduledDate')
    .optional()
    .isISO8601().withMessage('Scheduled date must be a valid date'),
  body('completedDate')
    .optional()
    .isISO8601().withMessage('Completed date must be a valid date'),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),
  handleValidationErrors
];

// --- Team validators ---

const validateCreateTeamMember = [
  body('projectId')
    .notEmpty().withMessage('Project ID is required')
    .isUUID().withMessage('Project ID must be a valid UUID'),
  body('userId')
    .optional({ nullable: true })
    .isUUID().withMessage('User ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Name must be at most 255 characters'),
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Email must be valid'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Phone must be at most 50 characters'),
  body()
    .custom((_, { req }) => {
      if (!req.body.userId && !req.body.name) {
        throw new Error('Either userId (for an existing user) or name (for an external member) is required');
      }
      return true;
    }),
  body('role')
    .optional()
    .trim(),
  body('allocation')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Allocation must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(TEAM_STATUSES).withMessage(`Status must be one of: ${TEAM_STATUSES.join(', ')}`),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  handleValidationErrors
];

const validateUpdateTeamMember = [
  param('id').isUUID().withMessage('Team member ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Name must be at most 255 characters'),
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Email must be valid'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Phone must be at most 50 characters'),
  body('role')
    .optional()
    .trim(),
  body('allocation')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Allocation must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(TEAM_STATUSES).withMessage(`Status must be one of: ${TEAM_STATUSES.join(', ')}`),
  handleValidationErrors
];

const validateAddSkill = [
  body('skillName')
    .trim()
    .notEmpty().withMessage('Skill name is required')
    .isLength({ max: 255 }),
  body('proficiencyLevel')
    .optional()
    .isIn(PROFICIENCY_LEVELS).withMessage(`Proficiency level must be one of: ${PROFICIENCY_LEVELS.join(', ')}`),
  body('certificationDate')
    .optional()
    .isISO8601().withMessage('Certification date must be a valid date'),
  body('expiryDate')
    .optional()
    .isISO8601().withMessage('Expiry date must be a valid date'),
  handleValidationErrors
];

// --- Allocation validators ---

const validateCreateAllocation = [
  body('projectId')
    .notEmpty().withMessage('Project ID is required')
    .isUUID().withMessage('Project ID must be a valid UUID'),
  body('resourceType')
    .notEmpty().withMessage('Resource type is required')
    .isIn(RESOURCE_TYPES).withMessage(`Resource type must be one of: ${RESOURCE_TYPES.join(', ')}`),
  body('resourceId')
    .notEmpty().withMessage('Resource ID is required')
    .isUUID().withMessage('Resource ID must be a valid UUID'),
  body('taskId')
    .optional()
    .isUUID().withMessage('Task ID must be a valid UUID'),
  body('quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('status')
    .optional()
    .isIn(ALLOCATION_STATUSES).withMessage(`Status must be one of: ${ALLOCATION_STATUSES.join(', ')}`),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  handleValidationErrors
];

const validateUpdateAllocation = [
  param('id').isUUID().withMessage('Allocation ID must be a valid UUID'),
  body('status')
    .optional()
    .isIn(ALLOCATION_STATUSES).withMessage(`Status must be one of: ${ALLOCATION_STATUSES.join(', ')}`),
  body('quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCreateMaterial,
  validateUpdateMaterial,
  validateCreateLabor,
  validateUpdateLabor,
  validateCreateEquipment,
  validateUpdateEquipment,
  validateCreateMaintenance,
  validateCreateTeamMember,
  validateUpdateTeamMember,
  validateAddSkill,
  validateCreateAllocation,
  validateUpdateAllocation
};
