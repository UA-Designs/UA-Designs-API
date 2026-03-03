# Coding Guidelines -- UA Designs API

Last Updated: March 3, 2026

---

## Purpose

These guidelines ensure that all code in the UA Designs API is consistent, readable, and maintainable -- whether written by a human or an AI agent.

---

## Table of Contents

1. [General Principles](#1-general-principles)
2. [JavaScript Conventions](#2-javascript-conventions)
3. [Project Architecture](#3-project-architecture)
4. [Models](#4-models)
5. [Services](#5-services)
6. [Controllers](#6-controllers)
7. [Routes](#7-routes)
8. [Middleware](#8-middleware)
9. [Error Handling](#9-error-handling)
10. [Response Format](#10-response-format)
11. [Database](#11-database)
12. [Naming Conventions](#12-naming-conventions)
13. [Prohibited Practices](#13-prohibited-practices)

---

## 1. General Principles

- Keep it simple. Prefer clarity over cleverness.
- Do not over-engineer. Build what is needed now, not what might be needed later.
- Every function should do one thing.
- Every file should have a single responsibility.
- Read existing code before writing new code. Match the patterns already in use.
- No emojis in code, comments, logs, or documentation.
- No placeholder code or TODO comments that are not tracked in project-status files.
- No console.log for debugging in committed code. Use console.error for actual errors only.

---

## 2. JavaScript Conventions

### Style

- Use `const` by default. Use `let` only when reassignment is needed. Never use `var`.
- Use single quotes for strings.
- Use semicolons at the end of statements.
- Use 2-space indentation.
- Use template literals for string interpolation.
- Use destructuring for object and array access.
- Use async/await instead of .then() chains.
- Use arrow functions for callbacks. Use regular functions for class methods.

### Imports

- Use `require()` (CommonJS). This project does not use ES modules.
- Group imports in this order:
  1. Node.js built-in modules
  2. Third-party modules (express, sequelize, etc.)
  3. Local modules (models, services, utils)
- Separate groups with a blank line.

### Example

```javascript
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');

const { Risk, RiskMitigation, RiskCategory, Project, User } = require('../../models');
const RiskService = require('../../services/Risk/riskService');
```

---

## 3. Project Architecture

The architecture follows a layered pattern:

```
Routes --> Middleware --> Controllers --> Services --> Models
```

- **Routes**: Define HTTP endpoints. Apply middleware. Call controller methods. No business logic.
- **Middleware**: Authentication, authorization, input validation. No business logic.
- **Controllers**: Extract data from requests. Call services. Format HTTP responses. Minimal logic.
- **Services**: All business logic. Receive plain data. Return plain data. No req/res objects.
- **Models**: Database schema definitions and Sequelize associations. No business logic.

Data flows in one direction. A layer can only call the layer directly below it.

---

## 4. Models

### Pattern

Models use the Sequelize factory pattern. Each model is a function that receives `(sequelize, Sequelize)` and returns a model.

```javascript
module.exports = (sequelize, Sequelize) => {
  const ModelName = sequelize.define('ModelName', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    // fields...
  }, {
    tableName: 'model_names',
    timestamps: true,
    paranoid: true  // soft deletes where applicable
  });

  return ModelName;
};
```

### Rules

- Always use UUID primary keys with UUIDV4 defaults.
- Always enable timestamps (createdAt, updatedAt).
- Use paranoid (soft delete) for user-facing data.
- Use snake_case for table names.
- Use camelCase for column names in JavaScript (Sequelize handles the mapping).
- Define associations in `src/models/index.js`, not in individual model files.
- Foreign keys must reference existing models.

---

## 5. Services

### Pattern

Services are ES6 classes. Each method is async. They receive plain objects and return plain objects.

```javascript
const { ModelName, RelatedModel } = require('../../models');

class DomainService {
  async getAll(filters) {
    const where = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;

    const items = await ModelName.findAndCountAll({
      where,
      include: [{ model: RelatedModel, as: 'alias' }],
      limit: filters.limit || 10,
      offset: ((filters.page || 1) - 1) * (filters.limit || 10),
      order: [[filters.sortBy || 'createdAt', filters.sortOrder || 'DESC']]
    });

    return {
      items: items.rows,
      total: items.count,
      page: filters.page || 1,
      totalPages: Math.ceil(items.count / (filters.limit || 10))
    };
  }

  async getById(id) {
    const item = await ModelName.findByPk(id, {
      include: [{ model: RelatedModel, as: 'alias' }]
    });
    return item;
  }

  async create(data) {
    const item = await ModelName.create(data);
    return item;
  }

  async update(id, data) {
    const item = await ModelName.findByPk(id);
    if (!item) return null;
    await item.update(data);
    return item;
  }

  async delete(id) {
    const item = await ModelName.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
  }
}

module.exports = new DomainService();
```

### Rules

- Export a singleton instance, not the class.
- Do not import express, req, or res.
- Do not set HTTP status codes.
- Return null or throw errors for not-found or invalid operations.
- Keep Sequelize queries in services, not controllers.

---

## 6. Controllers

### Pattern

Controllers are ES6 classes. They extract data from requests, call services, and return HTTP responses.

```javascript
const domainService = require('../../services/Domain/domainService');

class DomainController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        status: req.query.status,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await domainService.getAll(filters);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1
        }
      });
    } catch (error) {
      console.error('DomainController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch items',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const item = await domainService.getById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      res.json({ success: true, data: item });
    } catch (error) {
      console.error('DomainController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const item = await domainService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: item
      });
    } catch (error) {
      console.error('DomainController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const item = await domainService.update(req.params.id, req.body);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      res.json({
        success: true,
        message: 'Item updated successfully',
        data: item
      });
    } catch (error) {
      console.error('DomainController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await domainService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      res.json({
        success: true,
        message: 'Item deleted successfully'
      });
    } catch (error) {
      console.error('DomainController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new DomainController();
```

### Rules

- Export a singleton instance, not the class.
- Every method must be wrapped in try/catch.
- Use `req.params` for URL parameters, `req.query` for query strings, `req.body` for request bodies.
- Always return the standard response format (see section 10).
- Never put Sequelize queries directly in controllers -- call services instead.
- Log errors with `console.error` using the format `ClassName.methodName error:`.

---

## 7. Routes

### Pattern

Each domain has two files in `src/routes/<domain>/`:

**index.js** (barrel file):
```javascript
const express = require('express');
const router = express.Router();
const managementRoutes = require('./<domain>Management');

router.use('/', managementRoutes);

module.exports = router;
```

**<domain>Management.js** (route definitions):
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const domainController = require('../../controllers/Domain/domainController');
const { validateCreate, validateUpdate } = require('../../middleware/domainValidation');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'UA Designs Domain Service',
    timestamp: new Date().toISOString()
  });
});

// CRUD endpoints
router.get('/', authenticateToken, domainController.getAll);
router.get('/:id', authenticateToken, domainController.getById);
router.post('/', authenticateToken, validateCreate, domainController.create);
router.put('/:id', authenticateToken, validateUpdate, domainController.update);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), domainController.delete);

module.exports = router;
```

### Rules

- Routes only define HTTP method, path, middleware chain, and controller method.
- No business logic in route files.
- Always apply `authenticateToken` to protected endpoints.
- Apply `authorizeRoles` for restricted operations.
- Apply validation middleware before controller methods.
- Group related endpoints with a comment header.

---

## 8. Middleware

### Validation Middleware Pattern

```javascript
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

const validateCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('projectId').isUUID().withMessage('Valid project ID is required'),
  handleValidationErrors
];

const validateUpdate = [
  param('id').isUUID().withMessage('Valid ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  handleValidationErrors
];

module.exports = { validateCreate, validateUpdate, handleValidationErrors };
```

### Rules

- Use `express-validator` for input validation.
- Always include a `handleValidationErrors` function at the end of the validation chain.
- Return validation errors in the standard format.
- Validate UUIDs, required fields, type constraints, and length limits.

---

## 9. Error Handling

- All controller methods must use try/catch.
- All errors must be logged with `console.error`.
- In development mode, include `error.message` in the response.
- In production mode, return a generic message.
- Use standard HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad request / validation error
  - 401: Unauthorized (no token / invalid token)
  - 403: Forbidden (insufficient permissions)
  - 404: Not found
  - 409: Conflict (duplicate resource)
  - 500: Internal server error

---

## 10. Response Format

All API responses must follow this structure:

### Success Response

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {}
}
```

### Success Response with Pagination

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Description of what went wrong",
  "errors": []
}
```

---

## 11. Database

- Use Sequelize ORM for all database operations.
- Use SQLite for development, PostgreSQL for production.
- Use `alter: true` for safe migrations. Use `--force` flag only when a fresh database is needed.
- Seed data must be idempotent -- running seed multiple times should not create duplicates.
- Use transactions for operations that modify multiple tables.
- Use `findAndCountAll` for paginated queries.
- Use `include` for eager loading associations.
- Use `paranoid: true` for soft deletes on user-facing models.

---

## 12. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Directories (models, controllers, services) | PascalCase | `Risk/`, `Schedule/` |
| Directories (routes) | lowercase | `risk/`, `schedule/` |
| Files | camelCase | `riskService.js`, `taskController.js` |
| Classes | PascalCase | `RiskService`, `TaskController` |
| Variables and functions | camelCase | `getRiskById`, `totalCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `DEFAULT_LIMIT` |
| Database tables | snake_case | `risk_categories`, `task_dependencies` |
| API routes | lowercase with hyphens | `/api/risk/risks`, `/api/risk/critical-path` |
| Enum values | UPPER_SNAKE_CASE | `IN_PROGRESS`, `NOT_STARTED` |

---

## 13. Prohibited Practices

The following are not allowed in this project:

- Emojis in any code, comments, documentation, or log output.
- Using `var` for variable declarations.
- Using `.then()/.catch()` chains instead of async/await.
- Business logic in route files or controllers.
- Sequelize queries in controllers (must go through services).
- Importing `req` or `res` in service files.
- Using `console.log` for debugging in committed code.
- Hardcoding configuration values (use environment variables).
- Creating files outside the established directory structure.
- Using `force: true` in migration without the `--force` flag.
- Rewriting entire files when a targeted edit would suffice.
- Adding new npm dependencies without documenting the reason.
- Writing code without reading the existing codebase first.
- Skipping tests or documentation for a feature.
- Using `any` or untyped catch blocks (always log the error object).
