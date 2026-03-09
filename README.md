# UA Designs API

Backend API for UA Designs PMBOK-aligned Project Management System — Construction Industry Optimized.

## Overview

REST API for managing construction projects following PMBOK standards. Covers scheduling, cost management, resource tracking, risk management, stakeholder communications, and analytics.

**Stack:** Node.js + Express, Sequelize ORM, PostgreSQL (prod) / SQLite (dev/test), JWT auth.

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (production) — not needed for development with SQLite

## Setup

```bash
# 1. Clone and install
git clone https://github.com/UA-Designs/UA-Designs-API.git
cd UA-Designs-API
npm install

# 2. Configure environment
cp env.development .env
# Edit .env if needed — defaults work for local dev with PostgreSQL

# 3. Run database migration
npm run migrate

# 4. Seed demo data (optional — creates sample projects, users, tasks, costs, etc.)
npm run seed

# 5. Start development server
npm run dev
```

The API runs at **http://localhost:5000**. Visit it in a browser to see the admin dashboard.

## Deploying on Render

This repository now includes a Render Blueprint file: `render.yaml`.

### Option A: Blueprint deployment (recommended)

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** service from the repository.
3. Render provisions:
   - one Node web service (`ua-designs-api`)
   - one managed PostgreSQL database (`ua-designs-db`)
4. Set `CORS_ORIGIN` in Render to your frontend URL (for example `https://your-frontend.onrender.com`).
5. Deploy. Verify health at `/api/health`.

### Option B: Manual web service setup

If you create the service manually, use:

- Build Command: `npm ci`
- Start Command: `npm start`
- Environment: `Node`

And set these environment variables:

- `NODE_ENV=production`
- `DB_DIALECT=postgres`
- `DATABASE_URL` (from your Render Postgres instance)
- `DB_SSL=true`
- `JWT_SECRET` (strong random value)
- `JWT_REFRESH_SECRET` (strong random value)
- `CORS_ORIGIN` (your deployed frontend origin)

### Using SQLite (no database server needed)

Edit your `.env` and set:

```env
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
```

Then run `npm run migrate` and `npm run seed` as normal.

## Environment Variables

Copy `env.example` for a full reference. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `5000` | Server port |
| `DB_DIALECT` | `postgres` | `postgres` or `sqlite` |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `ua_designs_pms` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_STORAGE` | — | SQLite file path (when `DB_DIALECT=sqlite`) |
| `JWT_SECRET` | — | **Required.** Secret for signing JWTs |
| `JWT_EXPIRES_IN` | `24h` | Token expiry duration |

## Authentication & Roles

JWT-based auth. Include the token in all requests:

```
Authorization: Bearer <token>
```

### Roles

| Role | Access |
|------|--------|
| `ADMIN` | Unrestricted — user management, all CRUD |
| `PROJECT_MANAGER` | Full project control — create/edit projects, budgets, schedules, risks |
| `ENGINEER` | Write access — update tasks, input costs/resources, create risks |
| `STAFF` | Read-only on project data, can input communications |

### Demo Accounts (after seeding)

| Email | Password | Role |
|-------|----------|------|
| `admin@uadesigns.com` | `password123` | ADMIN |
| `manager@uadesigns.com` | `password123` | PROJECT_MANAGER |
| `engineer@uadesigns.com` | `password123` | ENGINEER |
| `staff@uadesigns.com` | `password123` | STAFF |

The first user registered gets full access. Additional users are registered by an ADMIN via `POST /api/auth/register`.

## API Endpoints

**Base URL:** `http://localhost:5000/api`

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/register` | ADMIN | Register new user |
| GET | `/auth/me` | Auth | Current user info |
| GET | `/auth/profile` | Auth | User profile |
| POST | `/auth/change-password` | Auth | Change password |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/projects` | Auth | List projects (paginated, filterable) |
| POST | `/projects` | Manager+ | Create project |
| GET | `/projects/:id` | Auth | Project details with dashboard |
| PUT | `/projects/:id` | Owner/Admin | Update project |
| PATCH | `/projects/:id/status` | Owner/Admin | Update status |
| PATCH | `/projects/:id/assign-manager` | Admin | Assign PM |
| DELETE | `/projects/:id` | Admin | Delete project |

### Schedule (Tasks & Dependencies)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/schedule/tasks` | Auth | List tasks |
| POST | `/schedule/tasks` | Manager+ | Create task |
| PUT | `/schedule/tasks/:id` | Engineer+ | Update task |
| PATCH | `/schedule/tasks/:id/status` | Engineer+ | Update task status |
| DELETE | `/schedule/tasks/:id` | Manager+ | Delete task |
| GET | `/schedule/dependencies` | Auth | List dependencies |
| POST | `/schedule/dependencies` | Manager+ | Create dependency |
| GET | `/schedule/schedule` | Auth | Project schedule view |

### Cost Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/cost/costs` | Auth | List costs |
| POST | `/cost/costs` | Engineer+ | Create cost item |
| PUT | `/cost/costs/:id` | Engineer+ | Update cost |
| DELETE | `/cost/costs/:id` | Manager+ | Delete cost |
| GET | `/cost/budgets` | Auth | List budgets |
| POST | `/cost/budgets` | Manager+ | Create budget |
| GET | `/cost/expenses` | Auth | List expenses |
| POST | `/cost/expenses` | Engineer+ | Create expense |
| POST | `/cost/expenses/:id/receipts` | Auth | Upload receipt |
| GET | `/cost/analysis/:projectId` | Auth | Cost analysis |

### Risk Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/risk/risks` | Auth | List risks |
| POST | `/risk/risks` | Engineer+ | Create risk |
| PUT | `/risk/risks/:id` | Engineer+ | Update risk |
| DELETE | `/risk/risks/:id` | Manager+ | Delete risk |
| POST | `/risk/risks/:id/mitigations` | Manager+ | Add mitigation |

### Resources
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/resources/materials` | Auth | List materials |
| POST | `/resources/materials` | Engineer+ | Add material |
| GET | `/resources/labor` | Auth | List labor entries |
| GET | `/resources/equipment` | Auth | List equipment |
| GET | `/resources/team` | Auth | List team members |
| POST | `/resources/team` | Manager+ | Add team member |

### Stakeholders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/stakeholders` | Auth | List stakeholders |
| POST | `/stakeholders` | Manager+ | Create stakeholder |
| POST | `/stakeholders/:id/communications` | Auth | Log communication |
| POST | `/stakeholders/:id/feedback` | Auth | Submit feedback |

### Analytics & Audit
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/analytics/overview` | Auth | System-wide analytics |
| GET | `/analytics/project/:id` | Auth | Project analytics |
| GET | `/audit` | Admin | Audit log |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Manager+ | List users |
| POST | `/users` | Admin | Create user |
| GET | `/users/:id` | Self/Manager+ | User details |
| PUT | `/users/:id` | Self/Admin | Update user |
| PATCH | `/users/:id/deactivate` | Admin | Deactivate user |

## Testing

Tests use an in-memory SQLite database — no external services needed.

```bash
# Run all tests
npm test

# Run a specific test file
npx jest tests/integration/auth/auth.test.js

# Run tests matching a pattern
npx jest --testPathPattern=rbac

# Run with coverage
npx jest --coverage
```

**Test count:** 705 tests across 29 suites (unit + integration).

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node src/server.js` | Production server |
| `npm run dev` | `nodemon src/server.js` | Dev server with auto-reload |
| `npm run dev:clean` | seed-clean + nodemon | Dev server with empty DB (admin only) |
| `npm run dev:demo` | seed-demo + nodemon | Dev server with full demo data |
| `npm test` | `jest` | Run test suite |
| `npm run migrate` | `node src/database/migrate.js` | Run database migrations |
| `npm run seed` | `node src/database/seed.js` | Seed demo data (alias for seed:demo) |
| `npm run seed:clean` | `node src/database/seed-clean.js` | Reset DB with 1 admin account |
| `npm run seed:demo` | `node src/database/seed-demo.js` | Reset DB with full demo dataset |
| `npm run lint` | `eslint src/` | Lint source code |

## Project Structure

```
src/
├── config/            # Database configuration
├── controllers/       # Request handlers
│   ├── Analytics/
│   ├── Cost/          # Budget, cost, expense controllers
│   ├── Resources/
│   ├── Risk/
│   ├── Schedule/
│   └── Stakeholders/
├── database/          # Migration and seed scripts
├── middleware/
│   ├── auth.js        # JWT authentication
│   ├── authorize.js   # Role-based access control
│   ├── roles.js       # Role constants and access levels
│   ├── auditLog.js    # Request audit logging
│   └── upload.js      # File upload (multer)
├── models/            # Sequelize models
│   ├── User/
│   ├── Project/
│   ├── Cost/
│   ├── Risk/
│   ├── Schedule/
│   ├── Resources/
│   ├── Stakeholder/
│   └── AuditLog/
├── routes/            # Express route definitions
├── services/          # Business logic layer
├── utils/             # Shared helpers
└── server.js          # App entry point

tests/
├── setup.js           # Global test config (in-memory SQLite)
├── helpers/           # Test utilities and seed data
├── unit/              # Unit tests
└── integration/       # Integration tests (one folder per module)
```

## License

UNLICENSED
