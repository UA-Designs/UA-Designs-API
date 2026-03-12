/**
 * Cost Validation Middleware
 * Validates input data for cost-related operations
 */

/**
 * Validate cost creation/update data
 */
const validateCost = (req, res, next) => {
  const { name, type, amount, date } = req.body;
  const errors = [];

  // Required field validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }

  if (!type) {
    errors.push({ field: 'type', message: 'Type is required' });
  } else {
    const validTypes = ['MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'OTHER', 'FUEL', 'FORMWORKS'];
    const typeUpper = type.toUpperCase();
    if (!validTypes.includes(typeUpper)) {
      errors.push({ field: 'type', message: `Type must be one of: ${validTypes.join(', ')}` });
    } else {
      req.body.type = typeUpper;
    }
  }

  if (amount === undefined || amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }

  if (!date) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else if (isNaN(Date.parse(date))) {
    errors.push({ field: 'date', message: 'Date must be a valid date string' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate budget creation/update data
 */
const validateBudget = (req, res, next) => {
  const { name, amount, projectId } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }

  if (amount === undefined || amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }

  if (!projectId) {
    errors.push({ field: 'projectId', message: 'Project ID is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate expense creation/update data
 */
const validateExpense = (req, res, next) => {
  const { name, amount, category, date, projectId } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }

  if (amount === undefined || amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }

  if (!category) {
    errors.push({ field: 'category', message: 'Category is required' });
  } else {
    const validCategories = ['MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'SUBCONTRACTOR', 'PERMITS', 'OTHER'];
    if (!validCategories.includes(category.toUpperCase())) {
      errors.push({ field: 'category', message: `Category must be one of: ${validCategories.join(', ')}` });
    }
  }

  if (!date) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else if (isNaN(Date.parse(date))) {
    errors.push({ field: 'date', message: 'Date must be a valid date string' });
  }

  if (!projectId) {
    errors.push({ field: 'projectId', message: 'Project ID is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate expense status update
 */
const validateExpenseStatus = (req, res, next) => {
  const { status } = req.body;
  const errors = [];

  if (!status) {
    errors.push({ field: 'status', message: 'Status is required' });
  } else {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];
    if (!validStatuses.includes(status.toUpperCase())) {
      errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate rejection with reason
 */
const validateRejection = (req, res, next) => {
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'reason', message: 'Rejection reason is required' }]
    });
  }

  next();
};

/**
 * Validate UUID parameter
 */
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}: must be a valid UUID`
      });
    }

    next();
  };
};

/**
 * Validate date range query parameters
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && isNaN(Date.parse(startDate))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid startDate: must be a valid date string'
    });
  }

  if (endDate && isNaN(Date.parse(endDate))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid endDate: must be a valid date string'
    });
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range: startDate must be before endDate'
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page: must be a positive integer'
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit: must be between 1 and 100'
      });
    }
  }

  next();
};

/**
 * Validate amount thresholds
 */
const validateAmountThreshold = (threshold) => {
  return (req, res, next) => {
    const { amount } = req.body;

    if (amount !== undefined && parseFloat(amount) > threshold) {
      // Mark request as needing approval
      req.requiresApproval = true;
      req.thresholdExceeded = parseFloat(amount);
    }

    next();
  };
};

module.exports = {
  validateCost,
  validateBudget,
  validateExpense,
  validateExpenseStatus,
  validateRejection,
  validateUUID,
  validateDateRange,
  validatePagination,
  validateAmountThreshold
};
