# Comprehensive Testing Guidelines — UA Designs API

Last Updated: March 3, 2026

---

## Overview

This document is the **actionable testing plan** for the UA Designs API. It covers every domain, specifies exact test cases per endpoint, documents known issues, and defines the execution order for backfilling tests.

For general patterns and conventions, see [TESTING_STRATEGY.md](TESTING_STRATEGY.md).

---

## Table of Contents

1. [Current Coverage Summary](#1-current-coverage-summary)
2. [Architecture & Patterns](#2-architecture--patterns)
3. [Test Infrastructure](#3-test-infrastructure)
4. [Domain Test Plans](#4-domain-test-plans)
   - 4.1 [Auth](#41-auth--apiauth)
   - 4.2 [Users](#42-users--apiusers)
   - 4.3 [Projects](#43-projects--apiprojects)
   - 4.4 [Schedule](#44-schedule--apischedule)
   - 4.5 [Dashboard](#45-dashboard--apidashboard)
   - 4.6 [Cost Management](#46-cost-management--apicost)
5. [Known Issues & Bugs](#5-known-issues--bugs)
6. [Execution Order](#6-execution-order)
7. [Test Case Writing Rules](#7-test-case-writing-rules)
8. [Checklist Per Domain](#8-checklist-per-domain)

---

## 1. Current Coverage Summary

| Domain | Endpoints | Tests | Status |
|--------|-----------|-------|--------|
| Auth | 7 | 0 | **UNTESTED** |
| Users | 12 | 0 | **UNTESTED** |
| Projects | 13 | 0 | **UNTESTED** |
| Schedule | 15 | 0 | **UNTESTED** |
| Dashboard | 6 | 0 | **UNTESTED — mock data** |
| Cost | 1 (stub) | 0 | **NOT IMPLEMENTED** |
| Risk | 17 | 61 | ✅ Complete |
| Resources | 32 | 111 | ✅ Complete |
| Stakeholders | 16 | 48 | ✅ Complete |

**Total:** 119 endpoints, 220 tests covering 65 endpoints. **54 endpoints have zero test coverage.**

---

## 2. Architecture & Patterns

### Two Implementation Styles

The codebase has **two distinct patterns** that require different testing approaches:

#### Style A — Inline Route Logic (Auth, Users, Projects, Dashboard)

Routes contain all business logic inline. No controllers or services.

```
src/routes/auth/index.js        → inline handlers
src/routes/users/index.js       → inline handlers
src/routes/projects/index.js    → inline handlers
src/routes/dashboard/index.js   → inline handlers (mock data)
```

**Testing approach:** Integration tests only. No unit tests needed since there are no isolated service methods to test.

#### Style B — Controller + Service (Schedule, Risk, Resources, Stakeholders)

Routes delegate to controllers, which call services.

```
src/routes/schedule/scheduleManagement.js → taskController → taskService
src/routes/risk/riskManagement.js         → riskController → riskService
src/routes/resources/resourceManagement.js → controllers   → services
src/routes/stakeholders/stakeholderManagement.js → controllers → services
```

**Testing approach:** Unit tests for services + integration tests for full API flow.

### Response Format

All endpoints follow this response pattern:

```javascript
// Single resource
{ success: true, data: { ... } }

// List with pagination
{
  success: true,
  data: [...],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 5,
    hasNext: false,
    hasPrev: false
  }
}

// Errors
{ success: false, error: 'Error message' }
// or
{ error: 'Error message' }

// Creation: status 201
// Success: status 200
// Validation error: status 400
// Unauthorized: status 401
// Forbidden: status 403
// Not found: status 404
// Server error: status 500
```

### Auth Middleware

```javascript
const { authenticateToken, authorizeRoles, authorizePermission } = require('../../middleware/auth');
const PM_ADMIN = ['ADMIN', 'PROJECT_MANAGER'];
```

- `authenticateToken` — Verifies JWT from `Authorization: Bearer <token>` header
- `authorizeRoles(...roles)` — Checks `req.user.role` against allowed roles
- `authorizePermission(permission)` — Checks `permissions` object on user record

---

## 3. Test Infrastructure

### Setup File (`tests/setup.js`)

```javascript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-unit-and-integration-tests';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.PORT = 0;
```

### Database Config (Test)

```javascript
test: {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  pool: { max: 1, min: 1, acquire: 60000, idle: 10000 }
}
```

**Critical:** `pool: { max: 1, min: 1 }` is mandatory for SQLite `:memory:` — multiple connections create separate databases.

### Available Factory Functions (`tests/helpers/testHelpers.js`)

| Function | Returns |
|----------|---------|
| `generateAuthToken(user)` | JWT string |
| `createTestUser(overrides)` | User data object with pre-hashed password |
| `createTestProject(overrides)` | Project data object |
| `createTestRisk(overrides)` | Risk data object |
| `createTestMitigation(overrides)` | Mitigation data object |
| `createTestRiskCategory(overrides)` | RiskCategory data object |
| `createTestMaterial(overrides)` | Material data object |
| `createTestLabor(overrides)` | Labor data object |
| `createTestEquipment(overrides)` | Equipment data object |
| `createTestTeamMember(overrides)` | TeamMember data object |
| `createTestAllocation(overrides)` | Allocation data object |
| `createTestStakeholder(overrides)` | Stakeholder data object |
| `createTestCommunication(overrides)` | Communication data object |
| `createTestEngagement(overrides)` | Engagement data object |

**Pre-hashed password:** `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi` → plaintext `password`

### Integration Test Boilerplate

Every integration test file follows this skeleton:

```javascript
const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');

let authToken;
let adminToken;
let testUser;
let adminUser;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'admin@uadesigns.com' }));
  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: testUser.id
  });

  authToken = generateAuthToken(testUser);
  adminToken = generateAuthToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});
```

### Unit Test Boilerplate (for services)

```javascript
const { sequelize } = require('../../../../src/models');

let service;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  service = require('../../../../src/services/Module/serviceName');
});

afterAll(async () => {
  await sequelize.close();
});
```

**Note:** `PRAGMA foreign_keys = OFF` allows fake UUIDs for foreign keys in unit tests, avoiding the need to create parent records.

---

## 4. Domain Test Plans

### 4.1 Auth — `/api/auth`

**File:** `src/routes/auth/index.js` (inline logic, no controller/service)  
**Test file:** `tests/integration/auth/auth.test.js`  
**Test type:** Integration only

#### Endpoints & Test Cases

##### `GET /api/auth/health` — No auth

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Health check returns 200 | `{ status: 'OK' }` |

##### `POST /api/auth/register` — No auth enforced (see Known Issues #1)

| # | Test Case | Expected |
|---|-----------|----------|
| 2 | Register with valid data | 201, returns `{ user, token }` |
| 3 | Register with duplicate email | 400, error message |
| 4 | Register with missing required fields (email, password, firstName, lastName) | 400, error message |
| 5 | Register with invalid email format | 400, error message |
| 6 | Verify returned token is valid JWT | Decoded token has `userId` and `role` |
| 7 | Verify password is hashed (not stored as plaintext) | DB user.password !== input password |

##### `POST /api/auth/login` — No auth

| # | Test Case | Expected |
|---|-----------|----------|
| 8 | Login with valid credentials | 200, returns `{ user, token }` |
| 9 | Login with wrong password | 401, error message |
| 10 | Login with non-existent email | 401, error message |
| 11 | Login with inactive user | 403 or 401, error message |
| 12 | Verify `lastLogin` timestamp is updated | DB check |

##### `GET /api/auth/me` — Auth required (manual token check)

| # | Test Case | Expected |
|---|-----------|----------|
| 13 | Get current user with valid token | 200, returns user data |
| 14 | Request without token | 401 |
| 15 | Request with expired/invalid token | 401 |

##### `GET /api/auth/profile` — Auth required (manual token check)

| # | Test Case | Expected |
|---|-----------|----------|
| 16 | Get profile with valid token | 200, returns user with `permissions`, `lastLogin` |
| 17 | Request without token | 401 |

##### `POST /api/auth/change-password` — Auth required (manual token check)

| # | Test Case | Expected |
|---|-----------|----------|
| 18 | Change password with correct current password | 200 |
| 19 | Can login with new password after change | 200 |
| 20 | Cannot login with old password after change | 401 |
| 21 | Wrong current password | 400 or 401 |
| 22 | Missing current or new password field | 400 |
| 23 | Request without token | 401 |

##### `POST /api/auth/logout` — No auth

| # | Test Case | Expected |
|---|-----------|----------|
| 24 | Logout returns success message | 200 |

**Total: ~24 test cases**

#### Special Considerations

- Auth routes use **manual JWT verification** (inline `jwt.verify`), not the `authenticateToken` middleware
- The `register` endpoint has **no auth guard** despite a comment saying "Admin only" — test the current behavior, document the gap
- The pre-hashed password in test helpers (`password`) must be used for login tests
- Register creates new users, so use unique emails per test to avoid collisions
- Tests run sequentially within the describe block — chain register → login → profile → change-password

---

### 4.2 Users — `/api/users`

**File:** `src/routes/users/index.js` (inline logic)  
**Test file:** `tests/integration/users/users.test.js`  
**Test type:** Integration only

#### Setup Requirements

Need **three auth tokens** for role-based testing:

```javascript
// ADMIN — full access
const adminUser = await User.create(createTestUser({ role: 'ADMIN', email: 'admin@uadesigns.com' }));
const adminToken = generateAuthToken(adminUser);

// PROJECT_MANAGER — limited access
const pmUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER', email: 'pm@uadesigns.com' }));
const pmToken = generateAuthToken(pmUser);

// TEAM_MEMBER — minimal access
const memberUser = await User.create(createTestUser({ role: 'TEAM_MEMBER', email: 'member@uadesigns.com' }));
const memberToken = generateAuthToken(memberUser);
```

#### Endpoints & Test Cases

##### `GET /api/users/health` — No auth

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Health check returns 200 | `{ status: 'OK' }` |

##### `GET /api/users/` — ADMIN, PROJECT_MANAGER

| # | Test Case | Expected |
|---|-----------|----------|
| 2 | List users as ADMIN | 200, paginated array |
| 3 | List users as PM | 200, paginated array |
| 4 | List users as TEAM_MEMBER | 403 |
| 5 | No token | 401 |
| 6 | Filter by role (`?role=ADMIN`) | 200, only admins returned |
| 7 | Filter by department | 200, filtered results |
| 8 | Filter by isActive (`?isActive=true`) | 200, only active users |
| 9 | Search by name/email (`?search=admin`) | 200, matching results |
| 10 | Pagination (`?page=1&limit=5`) | 200, correct pagination metadata |
| 11 | Sorting (`?sortBy=createdAt&sortOrder=desc`) | 200, correctly sorted |

##### `GET /api/users/stats/overview` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 12 | Stats as ADMIN | 200, total/active/inactive/byRole/recent |
| 13 | Stats as PM | 403 |
| 14 | No token | 401 |

##### `GET /api/users/role/:role` — ADMIN, PROJECT_MANAGER

| # | Test Case | Expected |
|---|-----------|----------|
| 15 | Get users by role ADMIN | 200, array of admins |
| 16 | Invalid role | 400 or empty array |
| 17 | As TEAM_MEMBER | 403 |

##### `GET /api/users/:id` — Any authenticated (self); ADMIN/PM (others)

| # | Test Case | Expected |
|---|-----------|----------|
| 18 | Get own profile as TEAM_MEMBER | 200, user data |
| 19 | Get other user as ADMIN | 200, user data |
| 20 | Get other user as TEAM_MEMBER | 403 |
| 21 | Non-existent ID | 404 |

##### `GET /api/users/:id/permissions` — Any authenticated (self); ADMIN (others)

| # | Test Case | Expected |
|---|-----------|----------|
| 22 | Get own permissions | 200 |
| 23 | Get other's permissions as ADMIN | 200 |
| 24 | Get other's permissions as TEAM_MEMBER | 403 |

##### `POST /api/users/` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 25 | Create user with valid data as ADMIN | 201 |
| 26 | Create user as PM | 403 |
| 27 | Duplicate email | 400 |
| 28 | Missing required fields | 400 |
| 29 | No token | 401 |

##### `PUT /api/users/:id` — Any authenticated (self-update); ADMIN (others)

| # | Test Case | Expected |
|---|-----------|----------|
| 30 | Update own profile | 200 |
| 31 | ADMIN updates another user's role | 200 |
| 32 | Non-ADMIN tries to change role | 403 (or role change ignored) |
| 33 | Non-existent ID | 404 |

##### `PUT /api/users/:id/permissions` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 34 | Update permissions as ADMIN | 200 |
| 35 | Update permissions as PM | 403 |

##### `PATCH /api/users/:id/deactivate` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 36 | Deactivate user as ADMIN | 200 |
| 37 | ADMIN cannot deactivate self | 400 or 403 |
| 38 | Non-existent ID | 404 |
| 39 | Deactivate as PM | 403 |

##### `PATCH /api/users/:id/activate` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 40 | Activate previously deactivated user | 200 |
| 41 | As PM | 403 |

##### `DELETE /api/users/:id` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 42 | Delete user as ADMIN | 200 |
| 43 | ADMIN cannot delete self | 400 or 403 |
| 44 | Delete as PM | 403 |
| 45 | Non-existent ID | 404 |

**Total: ~45 test cases**

#### Special Considerations

- **Route ordering bug:** `GET /stats/overview` and `GET /role/:role` may be shadowed by `GET /:id`. Test these endpoints — if they fail, the route order must be fixed before tests can pass.
- Heavy role-based authorization — need 3 user types minimum
- Self-referential rules: "cannot delete self," "cannot deactivate self"
- Pagination tests: verify `currentPage`, `totalPages`, `totalItems`, `hasNext`, `hasPrev`

---

### 4.3 Projects — `/api/projects`

**File:** `src/routes/projects/index.js` (inline logic)  
**Test file:** `tests/integration/projects/projects.test.js`  
**Test type:** Integration only

#### Endpoints & Test Cases

##### `GET /api/projects/health` — No auth

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Health check | 200 |

##### `GET /api/projects/` — Any authenticated

| # | Test Case | Expected |
|---|-----------|----------|
| 2 | List projects | 200, paginated array |
| 3 | Filter by status | 200, filtered |
| 4 | Filter by projectType | 200, filtered |
| 5 | Filter by phase | 200, filtered |
| 6 | Search by name/client | 200, matching results |
| 7 | Pagination | 200, correct metadata |
| 8 | No token | 401 |

##### `GET /api/projects/stats/overview` — Any authenticated

| # | Test Case | Expected |
|---|-----------|----------|
| 9 | Get project stats | 200, counts by status/type, budget totals |
| 10 | No token | 401 |

##### `GET /api/projects/status/:status` — Any authenticated

| # | Test Case | Expected |
|---|-----------|----------|
| 11 | Filter by valid status | 200 |
| 12 | Invalid status | 200 empty or 400 |

##### `GET /api/projects/type/:type` — Any authenticated

| # | Test Case | Expected |
|---|-----------|----------|
| 13 | Filter by valid type | 200 |

##### `GET /api/projects/user/:userId` — Any authenticated (self); ADMIN (others)

| # | Test Case | Expected |
|---|-----------|----------|
| 14 | Get own projects | 200 |
| 15 | Get others' projects as ADMIN | 200 |
| 16 | Get others' projects as non-ADMIN | 403 |

##### `GET /api/projects/:id` — Any authenticated

| # | Test Case | Expected |
|---|-----------|----------|
| 17 | Get project by ID | 200, includes manager info |
| 18 | Non-existent ID | 404 |
| 19 | No token | 401 |

##### `GET /api/projects/:id/dashboard` — Any authenticated

| # | Test Case | Expected |
|---|-----------|----------|
| 20 | Get project PMBOK dashboard | 200, counts for all knowledge areas |
| 21 | Non-existent project | 404 |

**KNOWN ISSUE:** This endpoint references `Budget`, `Risk`, `Stakeholder`, `Material`, `Labor`, `Equipment` models that may not be imported. Test will likely fail — **fix the import first**.

##### `POST /api/projects/` — ADMIN, PROJECT_MANAGER

| # | Test Case | Expected |
|---|-----------|----------|
| 22 | Create project with valid data | 201 |
| 23 | Create project as TEAM_MEMBER | 403 |
| 24 | Missing required fields | 400 |
| 25 | No token | 401 |

##### `PUT /api/projects/:id` — Authenticated (ADMIN or assigned PM only)

| # | Test Case | Expected |
|---|-----------|----------|
| 26 | Update as assigned PM | 200 |
| 27 | Update as ADMIN | 200 |
| 28 | Update as unrelated user | 403 |
| 29 | Non-existent ID | 404 |

##### `PATCH /api/projects/:id/status` — Authenticated (ADMIN or assigned PM only)

| # | Test Case | Expected |
|---|-----------|----------|
| 30 | Update status/phase | 200 |
| 31 | Unauthorized user | 403 |

##### `PATCH /api/projects/:id/assign-manager` — ADMIN, PROJECT_MANAGER

| # | Test Case | Expected |
|---|-----------|----------|
| 32 | Assign manager | 200 |
| 33 | Assign non-existent user | 404 or 400 |

##### `DELETE /api/projects/:id` — ADMIN only

| # | Test Case | Expected |
|---|-----------|----------|
| 34 | Delete as ADMIN | 200 |
| 35 | Delete as PM | 403 |
| 36 | Non-existent ID | 404 |

**Total: ~36 test cases**

#### Special Considerations

- **Route ordering bug:** `/stats/overview`, `/status/:status`, `/type/:type`, `/user/:userId` are defined **after** `/:id` — they will be shadowed. **Must fix route order before tests pass.**
- **Missing model imports** in the `/:id/dashboard` endpoint — will crash. **Must fix imports before testing.**
- The `createTestProject` helper includes a `projectNumber` field. Verify the model accepts it.

---

### 4.4 Schedule — `/api/schedule`

**File:** `src/routes/schedule/scheduleManagement.js` → `src/controllers/Schedule/taskController.js` → `src/services/Schedule/taskService.js`  
**Test files:**
- `tests/unit/services/Schedule/taskService.test.js`
- `tests/integration/schedule/schedule.test.js`  
**Test type:** Unit + Integration

#### Setup Requirements

Schedule tests need a project to exist before creating tasks:

```javascript
testProject = await Project.create({
  ...createTestProject(),
  projectManagerId: testUser.id
});
```

**New factory function needed:** `createTestTask(overrides)` — add to `testHelpers.js`:

```javascript
function createTestTask(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Task',
    description: 'A test task for automated testing',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    progress: 0,
    ...overrides
  };
}
```

#### Unit Tests — `taskService.test.js`

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Get all tasks for a project | Paginated results |
| 2 | Get all tasks — empty project | Empty array |
| 3 | Get task by ID | Task object |
| 4 | Get task by ID — non-existent | Throws or returns null |
| 5 | Create task with valid data | Task with ID |
| 6 | Create task — missing required fields | Throws |
| 7 | Update task | Updated fields |
| 8 | Update task status/progress | Updated status |
| 9 | Delete task | Success |
| 10 | Create dependency | Dependency object |
| 11 | Create circular dependency | Throws or blocked |
| 12 | Get dependencies for task | Array of dependencies |
| 13 | Delete dependency | Success |
| 14 | Calculate critical path | Array of task IDs on critical path |
| 15 | Critical path — no tasks | Empty array |

**Unit total: ~15 tests**

#### Integration Tests — `schedule.test.js`

##### `GET /api/schedule/health` — No auth

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Health check | 200 |

##### Tasks — CRUD

| # | Test Case | Expected |
|---|-----------|----------|
| 2 | Create task under project | 201 |
| 3 | Create task — missing project | 400 |
| 4 | Create task — no token | 401 |
| 5 | Get all tasks for project | 200, array |
| 6 | Get tasks via query param | 200 |
| 7 | Get task by ID | 200 |
| 8 | Get task — non-existent | 404 |
| 9 | Update task | 200 |
| 10 | Update task status/progress | 200 |
| 11 | Delete task | 200 |
| 12 | Delete task — non-existent | 404 |

##### Dependencies

| # | Test Case | Expected |
|---|-----------|----------|
| 13 | Create dependency | 201 |
| 14 | Get task dependencies | 200, array |
| 15 | Get project dependencies | 200, array |
| 16 | Delete dependency | 200 |
| 17 | Create dependency — invalid task ID | 400 or 404 |

##### Critical Path & Schedule View

| # | Test Case | Expected |
|---|-----------|----------|
| 18 | Get critical path | 200, array |
| 19 | Get schedule/Gantt data | 200, tasks with deps |
| 20 | Critical path — no tasks | 200, empty |

**Integration total: ~20 tests**

**Combined Schedule total: ~35 tests**

#### Special Considerations

- Schedule delegates to `taskController` + `taskService` — follow the Risk/Resources pattern for unit tests
- Tasks have dependencies (FS, SS, FF, SF types) — test the dependency chain
- Critical path algorithm may need specific task date setups to test properly
- No role-based auth on schedule endpoints — any authenticated user has full access

---

### 4.5 Dashboard — `/api/dashboard`

**File:** `src/routes/dashboard/index.js` (inline, 100% mock data)  
**Test file:** `tests/integration/dashboard/dashboard.test.js`  
**Test type:** Integration only

The dashboard returns hardcoded mock data. Tests verify the **shape** and **auth requirements**, not real data.

#### Endpoints & Test Cases

| # | Endpoint | Test Case | Expected |
|---|----------|-----------|----------|
| 1 | `GET /stats` | Returns stats object | 200, has `totalProjects`, `activeTasks`, `totalBudget`, `teamMembers` |
| 2 | `GET /stats` | No token | 401 |
| 3 | `GET /project-progress` | Returns array | 200, array of objects with `name`, `progress`, `status` |
| 4 | `GET /task-progress` | Returns array | 200, array of task objects |
| 5 | `GET /cost-variance` | Returns array | 200, array with `category`, `planned`, `actual`, `variance` |
| 6 | `GET /recent-activities` | Returns array | 200, array with `action`, `user`, `timestamp` |
| 7 | `GET /recent-activities?limit=2` | Respects limit | 200, array length ≤ 2 |
| 8 | `GET /risk-matrix` | Returns array | 200, array with `title`, `probability`, `impact`, `severity` |

**Total: ~8 test cases**

#### Special Considerations

- All data is mock/hardcoded — tests only verify response shape and auth
- These tests will be very fast since there are no DB queries
- When the dashboard is eventually connected to real data, tests will need to be rewritten

---

### 4.6 Cost Management — `/api/cost`

**Status: NOT IMPLEMENTED**

The cost route file (`src/routes/cost/costManagement.js`) contains only a health check. No controllers, services, validation, or real endpoints exist.

**DO NOT write tests for Cost Management until it is implemented.** The models exist (`src/models/Cost/`) but there is no API layer.

When cost management is implemented, follow the same pattern as Risk:
- `src/controllers/Cost/costController.js`
- `src/services/Cost/costService.js`
- `src/utils/costCalculations.js` (the spec references earned value, variance, budget tracking)
- `tests/unit/services/Cost/costService.test.js`
- `tests/integration/cost/cost.test.js`

Refer to `project-status/specs/resource-management.md` and `project-status/cost-management.md` for the full endpoint specification when ready.

---

## 5. Known Issues & Bugs

Issues discovered during audit that **must be fixed before or during test writing**:

### Issue 1 — Auth Register Has No Auth Guard

**File:** `src/routes/auth/index.js`  
**Problem:** `POST /api/auth/register` has a comment saying "Admin only" but no `authenticateToken` or `authorizeRoles` middleware is attached.  
**Impact:** Anyone can register new users.  
**Decision needed:** Is open registration intended? If admin-only, add auth middleware. Tests should match the **intended** behavior.

### Issue 2 — Route Ordering in Users

**File:** `src/routes/users/index.js`  
**Problem:** `GET /stats/overview` and `GET /role/:role` are defined **after** `GET /:id`. Express matches routes in order, so `GET /stats/overview` will hit `:id` with `id = "stats"`.  
**Fix:** Move static routes (`/stats/overview`, `/role/:role`) above the `/:id` route.

### Issue 3 — Route Ordering in Projects

**File:** `src/routes/projects/index.js`  
**Problem:** Same as Issue 2. `/stats/overview`, `/status/:status`, `/type/:type`, `/user/:userId` are all defined after `/:id`.  
**Fix:** Move all static and parameterized-prefix routes above `/:id`.

### Issue 4 — Missing Model Imports in Project Dashboard

**File:** `src/routes/projects/index.js`  
**Endpoint:** `GET /api/projects/:id/dashboard`  
**Problem:** References `Budget`, `Risk`, `Stakeholder`, `Material`, `Labor`, `Equipment` models but they are not imported.  
**Fix:** Add the missing model imports at the top of the file.

### Issue 5 — Cost Management Marked "DONE" in STATUS.md

**File:** `project-status/STATUS.md`  
**Problem:** Cost Management is marked as complete, but only a health-check stub exists.  
**Fix:** Update STATUS.md to reflect actual state (NOT STARTED or IN PROGRESS).

### Issue 6 — Dashboard Uses 100% Mock Data

**File:** `src/routes/dashboard/index.js`  
**Problem:** All 6 endpoints return hardcoded mock data with 2024 dates. No database queries.  
**Impact:** Tests can only verify response shape, not correctness.  
**Note:** Acceptable for now, but must be replaced with real queries before production.

---

## 6. Execution Order

Tests must be written and committed in this order due to dependencies:

### Phase 1 — Fix Bugs First

Before writing any new tests:

1. **Fix route ordering** in `src/routes/users/index.js` — move `/stats/overview` and `/role/:role` above `/:id`
2. **Fix route ordering** in `src/routes/projects/index.js` — move static routes above `/:id`
3. **Fix missing imports** in `src/routes/projects/index.js` — add `Budget`, `Risk`, `Stakeholder`, `Material`, `Labor`, `Equipment` model imports
4. **Verify all 220 existing tests still pass** after fixes

### Phase 2 — Auth Tests

**Why first:** Auth endpoints (register, login) are foundational. Other domains depend on auth working correctly.

- Write `tests/integration/auth/auth.test.js`
- Add `createTestTask` factory to `testHelpers.js`
- ~24 tests
- **Commit:** `test: add auth endpoint tests`

### Phase 3 — Users Tests

**Why second:** User management is tested next because projects reference users (projectManagerId).

- Write `tests/integration/users/users.test.js`
- ~45 tests
- **Commit:** `test: add user management endpoint tests`

### Phase 4 — Projects Tests

**Why third:** Projects are parents of tasks (schedule), risks, resources, etc.

- Write `tests/integration/projects/projects.test.js`
- ~36 tests
- **Commit:** `test: add project management endpoint tests`

### Phase 5 — Schedule Tests

**Why fourth:** Schedule (tasks, dependencies) depends on projects.

- Write `tests/unit/services/Schedule/taskService.test.js`
- Write `tests/integration/schedule/schedule.test.js`
- ~35 tests
- **Commit:** `test: add schedule management tests`

### Phase 6 — Dashboard Tests

**Why last:** Dashboard is standalone mock data, lowest priority.

- Write `tests/integration/dashboard/dashboard.test.js`
- ~8 tests
- **Commit:** `test: add dashboard endpoint tests`

### Estimated Total New Tests: ~148

Combined with existing 220 tests → **~368 total tests**.

---

## 7. Test Case Writing Rules

### Must-Have Tests Per Endpoint

Every endpoint MUST have at minimum:

1. **Happy path** — valid request, expected response
2. **Auth guard** — request without token → 401
3. **Role guard** (if applicable) — wrong role → 403
4. **Validation** — missing/invalid fields → 400
5. **Not found** (for `:id` routes) — non-existent ID → 404

### Naming Convention

```javascript
describe('POST /api/auth/register', () => {
  it('should register a new user with valid data', async () => {});
  it('should return 400 for duplicate email', async () => {});
  it('should return 400 for missing required fields', async () => {});
});
```

- Describe block: `HTTP_METHOD /path`
- Test name: starts with `should`, describes expected behavior
- Include the expected status code in the name when testing error cases

### Assertions Checklist

```javascript
// Status code
expect(response.status).toBe(200);

// Response shape
expect(response.body.success).toBe(true);
expect(response.body.data).toHaveProperty('id');

// Pagination (for list endpoints)
expect(response.body.pagination).toHaveProperty('currentPage');
expect(response.body.pagination).toHaveProperty('totalPages');
expect(response.body.pagination).toHaveProperty('totalItems');

// Error responses
expect(response.body.success).toBe(false);
expect(response.body).toHaveProperty('error');

// Auth check
expect(response.status).toBe(401);

// Role check
expect(response.status).toBe(403);
```

### Sequential Test Dependencies

Some tests depend on prior test state (e.g., create → get → update → delete). Use `let` variables scoped to the describe block:

```javascript
describe('CRUD flow', () => {
  let createdId;

  it('should create', async () => {
    const res = await request(app).post('/api/...').send({...});
    createdId = res.body.data.id;
  });

  it('should get by id', async () => {
    const res = await request(app).get(`/api/.../${createdId}`);
    expect(res.status).toBe(200);
  });

  it('should update', async () => {
    const res = await request(app).put(`/api/.../${createdId}`).send({...});
    expect(res.status).toBe(200);
  });

  it('should delete', async () => {
    const res = await request(app).delete(`/api/.../${createdId}`);
    expect(res.status).toBe(200);
  });
});
```

### What NOT To Do

- **Don't mock the database** in integration tests — use the real SQLite in-memory DB
- **Don't hardcode UUIDs** — use `uuidv4()` or capture IDs from creation responses
- **Don't import services directly** in integration tests — test through HTTP only
- **Don't test internal implementation details** — test inputs and outputs
- **Don't share state between test files** — each file gets a fresh `sequelize.sync({ force: true })`
- **Don't skip auth checks** — every protected endpoint must have a 401 test

---

## 8. Checklist Per Domain

Use this checklist when writing tests for each domain:

```
[ ] Test file created in correct directory
[ ] beforeAll: sequelize.sync({ force: true })
[ ] beforeAll: create test users (admin, pm, member as needed)
[ ] beforeAll: create test project (if domain requires it)
[ ] beforeAll: generate auth tokens for each role
[ ] afterAll: sequelize.close()
[ ] Health check endpoint tested
[ ] All CRUD operations tested (happy path)
[ ] All 401 (no token) cases tested
[ ] All 403 (wrong role) cases tested
[ ] All 400 (validation error) cases tested
[ ] All 404 (not found) cases tested
[ ] Pagination tested (page, limit, totalPages, hasNext, hasPrev)
[ ] Filter/search parameters tested (if applicable)
[ ] Self-referential rules tested (e.g., "cannot delete self")
[ ] Sequential CRUD flow works (create → read → update → delete)
[ ] All tests pass: npx jest <test-file-path>
[ ] Existing 220 tests still pass: npm test
[ ] Committed with clean message: test: add <domain> tests
```

---

## Appendix: File Paths Quick Reference

### Existing Test Files (reference implementations)

| File | Tests | Domain |
|------|-------|--------|
| `tests/integration/risk/risk.test.js` | 31 | Risk integration |
| `tests/unit/services/Risk/riskService.test.js` | 30 | Risk unit |
| `tests/integration/resources/resources.test.js` | 42 | Resources integration |
| `tests/unit/services/Resources/resourceService.test.js` | 69 | Resources unit |
| `tests/integration/stakeholders/stakeholders.test.js` | 21 | Stakeholders integration |
| `tests/unit/services/Stakeholders/stakeholderService.test.js` | 27 | Stakeholders unit |

### New Test Files to Create

| File | Domain | Type |
|------|--------|------|
| `tests/integration/auth/auth.test.js` | Auth | Integration |
| `tests/integration/users/users.test.js` | Users | Integration |
| `tests/integration/projects/projects.test.js` | Projects | Integration |
| `tests/unit/services/Schedule/taskService.test.js` | Schedule | Unit |
| `tests/integration/schedule/schedule.test.js` | Schedule | Integration |
| `tests/integration/dashboard/dashboard.test.js` | Dashboard | Integration |

### Route Files Under Test

| File | Domain |
|------|--------|
| `src/routes/auth/index.js` | Auth |
| `src/routes/users/index.js` | Users |
| `src/routes/projects/index.js` | Projects |
| `src/routes/schedule/scheduleManagement.js` | Schedule |
| `src/routes/dashboard/index.js` | Dashboard |
