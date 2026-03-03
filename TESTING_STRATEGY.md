# Testing Strategy -- UA Designs API

Last Updated: March 3, 2026

---

## Purpose

Define how tests are written, organized, and run for the UA Designs API. Every feature must have tests before it is marked complete.

---

## Table of Contents

1. [Test Framework](#1-test-framework)
2. [Directory Structure](#2-directory-structure)
3. [Test Categories](#3-test-categories)
4. [Writing Unit Tests](#4-writing-unit-tests)
5. [Writing Integration Tests](#5-writing-integration-tests)
6. [Test Naming Conventions](#6-test-naming-conventions)
7. [Test Data](#7-test-data)
8. [Coverage Requirements](#8-coverage-requirements)
9. [Running Tests](#9-running-tests)

---

## 1. Test Framework

- **Test runner**: Jest (already in devDependencies)
- **HTTP testing**: Supertest (already in devDependencies)
- **Database**: SQLite in-memory for test isolation
- **No mocking libraries needed yet** -- use Jest built-in mocks

---

## 2. Directory Structure

```
tests/
  setup.js                          # Global test setup (database, fixtures)
  helpers/
    testHelpers.js                  # Shared utilities (auth tokens, factories)
  unit/
    services/
      Schedule/
        taskService.test.js
      Cost/
        costAnalysisService.test.js
        earnedValueService.test.js
      Risk/
        riskService.test.js
      Resources/
        resourceService.test.js
      Stakeholders/
        stakeholderService.test.js
    utils/
      costCalculations.test.js
      budgetUtils.test.js
  integration/
    auth/
      auth.test.js
    projects/
      projects.test.js
    schedule/
      schedule.test.js
    cost/
      cost.test.js
    risk/
      risk.test.js
    resources/
      resources.test.js
    stakeholders/
      stakeholders.test.js
    users/
      users.test.js
```

---

## 3. Test Categories

### Unit Tests

- Test service methods in isolation.
- Test utility functions.
- Test validation logic.
- Mock database calls when testing pure logic.
- Do not make HTTP requests.

### Integration Tests

- Test full API endpoints (HTTP request to response).
- Use a real SQLite in-memory database.
- Test authentication and authorization.
- Test validation error responses.
- Test complete CRUD workflows.

---

## 4. Writing Unit Tests

### Pattern for Service Tests

```javascript
const { sequelize } = require('../../src/models');

// Import the service after models are set up
let riskService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  riskService = require('../../src/services/Risk/riskService');
});

afterAll(async () => {
  await sequelize.close();
});

describe('RiskService', () => {
  describe('getAll', () => {
    it('should return paginated risks', async () => {
      const result = await riskService.getAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by project ID', async () => {
      const projectId = 'test-project-id';
      const result = await riskService.getAll({ projectId });

      result.items.forEach(item => {
        expect(item.projectId).toBe(projectId);
      });
    });
  });

  describe('create', () => {
    it('should create a risk with valid data', async () => {
      const data = {
        title: 'Test Risk',
        description: 'Test description',
        probability: 0.5,
        impact: 0.7,
        projectId: 'test-project-id'
      };

      const result = await riskService.create(data);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(data.title);
      expect(result.probability).toBe(data.probability);
    });

    it('should reject invalid data', async () => {
      await expect(riskService.create({})).rejects.toThrow();
    });
  });
});
```

### Pattern for Utility Tests

```javascript
const { calculateRiskScore } = require('../../src/utils/riskCalculations');

describe('riskCalculations', () => {
  describe('calculateRiskScore', () => {
    it('should multiply probability by impact', () => {
      expect(calculateRiskScore(0.5, 0.8)).toBe(0.4);
    });

    it('should return 0 for zero probability', () => {
      expect(calculateRiskScore(0, 0.8)).toBe(0);
    });

    it('should clamp values between 0 and 1', () => {
      expect(calculateRiskScore(1.5, 0.5)).toBe(0.5);
    });
  });
});
```

---

## 5. Writing Integration Tests

### Pattern for API Endpoint Tests

```javascript
const request = require('supertest');
const app = require('../../src/server');
const { sequelize, User } = require('../../src/models');
const jwt = require('jsonwebtoken');

let authToken;
let testUser;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Create a test user
  testUser = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@uadesigns.com',
    password: '$2a$10$hashedpassword',
    role: 'PROJECT_MANAGER',
    isActive: true
  });

  authToken = jwt.sign(
    { userId: testUser.id, role: testUser.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('Risk API', () => {
  let createdRiskId;

  describe('POST /api/risk/risks', () => {
    it('should create a risk with valid data', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Weather Delay Risk',
          description: 'Risk of construction delays due to weather',
          probability: 0.3,
          impact: 0.7,
          category: 'ENVIRONMENTAL',
          projectId: 'test-project-id'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      createdRiskId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/risk/risks')
        .send({ title: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/risk/risks', () => {
    it('should return paginated risks', async () => {
      const response = await request(app)
        .get('/api/risk/risks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/risk/risks/:id', () => {
    it('should return a risk by ID', async () => {
      const response = await request(app)
        .get(`/api/risk/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(createdRiskId);
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await request(app)
        .get('/api/risk/risks/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/risk/risks/:id', () => {
    it('should update a risk', async () => {
      const response = await request(app)
        .put(`/api/risk/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Risk Title' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Risk Title');
    });
  });

  describe('DELETE /api/risk/risks/:id', () => {
    it('should delete a risk', async () => {
      const response = await request(app)
        .delete(`/api/risk/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

---

## 6. Test Naming Conventions

- Test files: `<module>.test.js`
- Describe blocks: Use the class or module name.
- Nested describe blocks: Use the method name.
- Test names: Start with `should` and describe the expected behavior.

```javascript
describe('RiskService', () => {
  describe('calculateRiskScore', () => {
    it('should return probability multiplied by impact', () => {});
    it('should return 0 when probability is 0', () => {});
    it('should throw for negative values', () => {});
  });
});
```

---

## 7. Test Data

- Use factory functions in `tests/helpers/testHelpers.js` to create test data.
- Do not rely on seed data for tests -- tests must be self-contained.
- Clean up test data in `afterAll` or `afterEach` blocks as needed.
- Use realistic but clearly fake data (e.g., `test@uadesigns.com`, not real emails).

### Example Factory

```javascript
const { v4: uuidv4 } = require('uuid');

function createTestProject(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Project',
    projectNumber: 'UA-TEST-001',
    projectType: 'RESIDENTIAL',
    status: 'PLANNING',
    phase: 'INITIATION',
    clientName: 'Test Client',
    startDate: new Date(),
    plannedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    budget: 1000000,
    ...overrides
  };
}

function createTestUser(overrides = {}) {
  return {
    id: uuidv4(),
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}@uadesigns.com`,
    password: '$2a$10$hashedpassword',
    role: 'PROJECT_MANAGER',
    isActive: true,
    ...overrides
  };
}

function createTestRisk(overrides = {}) {
  return {
    id: uuidv4(),
    title: 'Test Risk',
    description: 'Test risk description',
    probability: 0.5,
    impact: 0.5,
    status: 'IDENTIFIED',
    ...overrides
  };
}

module.exports = { createTestProject, createTestUser, createTestRisk };
```

---

## 8. Coverage Requirements

Minimum coverage targets per feature:

| Category | Minimum Coverage |
|----------|-----------------|
| Service methods | 80% |
| Utility functions | 90% |
| API endpoints (integration) | 100% of documented endpoints |
| Validation middleware | 80% |

Every new feature must include:
- Unit tests for all service methods.
- Integration tests for all API endpoints.
- Tests for error cases (400, 401, 403, 404, 500).
- Tests for edge cases (empty data, large payloads, special characters).

---

## 9. Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific domain
npx jest tests/integration/risk/

# Run tests with coverage report
npx jest --coverage

# Run tests in watch mode during development
npx jest --watch

# Run a single test file
npx jest tests/unit/services/Risk/riskService.test.js
```

### Jest Configuration

Add to `package.json` if not present:

```json
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"],
    "setupFilesAfterSetup": ["./tests/setup.js"],
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/server.js",
      "!src/database/**"
    ]
  }
}
```
