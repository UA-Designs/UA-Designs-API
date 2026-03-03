# Cost Management API Documentation

## Overview
The Cost Management module implements PMBOK's **Project Cost Management** knowledge area, providing comprehensive endpoints for managing project costs, budgets, expenses, and cost analysis including Earned Value Management (EVM) metrics.

**Base URL:** `/api/cost`

## Authentication
All endpoints (except `/health`) require JWT authentication via `Authorization: Bearer <token>` header.

## Authorization Roles
| Role | Description |
|------|-------------|
| `ADMIN` | Full access to all cost management operations |
| `PROJECT_MANAGER` | Can create/edit budgets, approve/reject expenses |
| `TEAM_MEMBER` | Read access; can create costs and expenses |

---

## Health Check

### GET /api/cost/health
Returns the service health status.

**Auth Required:** No

**Response:**
```json
{
  "status": "OK",
  "service": "Cost Management",
  "endpoints": {
    "costs": "/costs",
    "budgets": "/budgets",
    "expenses": "/expenses",
    "analysis": "/analysis"
  }
}
```

---

## Cost Endpoints

### POST /api/cost/costs
Create a new cost entry.

**Auth Required:** Yes  
**Roles:** All authenticated users

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Cost entry name |
| `type` | enum | Yes | `MATERIAL`, `LABOR`, `EQUIPMENT`, `OVERHEAD`, `OTHER` |
| `amount` | number | Yes | Cost amount |
| `date` | string (ISO) | Yes | Date of the cost |
| `currency` | string | No | Currency code (default: `USD`) |
| `description` | string | No | Description |
| `projectId` | UUID | No | Associated project |
| `taskId` | UUID | No | Associated task |

**Response (201):**
```json
{
  "success": true,
  "message": "Cost created successfully",
  "data": {
    "id": "uuid",
    "name": "Foundation Materials",
    "type": "MATERIAL",
    "amount": "15000.00",
    "currency": "USD",
    "date": "2025-01-15T00:00:00.000Z",
    "status": "PENDING",
    "projectId": "uuid",
    ...
  }
}
```

### GET /api/cost/costs
Get all costs with filtering and pagination.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `projectId` | UUID | Filter by project |
| `taskId` | UUID | Filter by task |
| `type` | string | Filter by cost type |
| `status` | string | Filter by status |
| `startDate` | ISO date | Filter by date range start |
| `endDate` | ISO date | Filter by date range end |
| `minAmount` | number | Minimum amount filter |
| `maxAmount` | number | Maximum amount filter |
| `sortBy` | string | Sort field (default: `date`) |
| `sortOrder` | string | `ASC` or `DESC` (default: `DESC`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "costs": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /api/cost/costs/summary
Get cost summary grouped by type and status.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | UUID | Filter by project |
| `startDate` | ISO date | Date range start |
| `endDate` | ISO date | Date range end |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "byType": {
      "MATERIAL": { "count": 5, "total": 25000 },
      "LABOR": { "count": 3, "total": 18000 }
    },
    "byStatus": {
      "PENDING": { "count": 2, "total": 8000 },
      "APPROVED": { "count": 6, "total": 35000 }
    },
    "total": 43000,
    "approved": 35000,
    "pending": 8000,
    "rejected": 0,
    "paid": 0
  }
}
```

### GET /api/cost/costs/:id
Get a single cost by ID.

**Auth Required:** Yes

### PUT /api/cost/costs/:id
Update a cost entry. Non-admin users cannot modify approved or paid costs.

**Auth Required:** Yes

### DELETE /api/cost/costs/:id
Soft-delete a cost entry. Paid costs cannot be deleted.

**Auth Required:** Yes

### PATCH /api/cost/costs/:id/status
Update cost status (approve/reject/pay).

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | enum | Yes | `PENDING`, `APPROVED`, `REJECTED`, `PAID` |
| `notes` | string | No | Status change notes |

---

## Budget Endpoints

### POST /api/cost/budgets
Create a new budget for a project.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Budget name |
| `amount` | number | Yes | Budget amount |
| `projectId` | UUID | Yes | Associated project |
| `currency` | string | No | Currency code (default: `USD`) |
| `description` | string | No | Description |
| `startDate` | ISO date | No | Budget period start |
| `endDate` | ISO date | No | Budget period end |
| `contingency` | number | No | Contingency reserve (default: 0) |
| `managementReserve` | number | No | Management reserve (default: 0) |

**Response (201):**
```json
{
  "success": true,
  "message": "Budget created successfully",
  "data": {
    "id": "uuid",
    "name": "Q1 Construction Budget",
    "amount": "250000.00",
    "status": "PLANNED",
    "projectId": "uuid",
    ...
  }
}
```

### GET /api/cost/budgets
Get all budgets with filtering and pagination.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `projectId` | UUID | Filter by project |
| `status` | string | Filter by status |
| `sortBy` | string | Sort field (default: `createdAt`) |
| `sortOrder` | string | `ASC` or `DESC` (default: `DESC`) |

### GET /api/cost/budgets/:id
Get a single budget with expense details and utilization metrics.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Q1 Budget",
    "amount": "250000.00",
    "status": "APPROVED",
    "expenses": [...],
    "metrics": {
      "totalSpent": 75000,
      "remaining": 175000,
      "utilization": 30.0,
      "isOverBudget": false
    }
  }
}
```

### PUT /api/cost/budgets/:id
Update a budget. Non-admin users cannot modify closed budgets.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

### DELETE /api/cost/budgets/:id
Soft-delete a budget. Budgets with associated expenses cannot be deleted.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

### PATCH /api/cost/budgets/:id/approve
Approve a PLANNED budget. Only ADMIN can approve.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | string | No | Approval notes |

**Business Rules:**
- Only budgets with status `PLANNED` can be approved
- Status changes to `APPROVED`

### POST /api/cost/budgets/:id/revise
Create a revised version of a budget. Sets current budget to `REVISED` and creates a new `PLANNED` budget.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | No | New budget amount (inherits from previous if omitted) |
| `reason` | string | No | Revision reason |
| `description` | string | No | Updated description |

**Response (201):**
```json
{
  "success": true,
  "message": "Budget revised successfully",
  "data": {
    "previousBudget": { "status": "REVISED", ... },
    "newBudget": { "status": "PLANNED", ... }
  }
}
```

### PATCH /api/cost/budgets/:id/close
Close a budget. Only ADMIN can close.

**Auth Required:** Yes  
**Roles:** `ADMIN`

### GET /api/cost/budgets/:id/utilization
Get detailed budget utilization report.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budgetId": "uuid",
    "budgetName": "Q1 Budget",
    "budgetAmount": 250000,
    "currency": "USD",
    "summary": {
      "totalCommitted": 75000,
      "totalApproved": 50000,
      "totalPending": 15000,
      "totalPaid": 25000,
      "remaining": 175000,
      "utilizationPercent": 30.0,
      "isOverBudget": false
    },
    "byCategory": {
      "MATERIAL": { "count": 3, "total": 40000, "approved": 25000, "pending": 10000, "paid": 5000 },
      "LABOR": { "count": 2, "total": 35000, "approved": 25000, "pending": 5000, "paid": 20000 }
    },
    "expenseCount": 5
  }
}
```

---

## Expense Endpoints

### POST /api/cost/expenses
Create a new expense entry.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Expense name |
| `amount` | number | Yes | Expense amount |
| `category` | enum | Yes | `MATERIAL`, `LABOR`, `EQUIPMENT`, `OVERHEAD`, `SUBCONTRACTOR`, `PERMITS`, `OTHER` |
| `date` | string (ISO) | Yes | Expense date |
| `projectId` | UUID | Yes | Associated project |
| `currency` | string | No | Currency code (default: `USD`) |
| `description` | string | No | Description |
| `budgetId` | UUID | No | Associated budget |
| `taskId` | UUID | No | Associated task |
| `categoryId` | UUID | No | Cost category reference |
| `vendor` | string | No | Vendor name |
| `invoiceNumber` | string | No | Invoice reference |
| `receiptNumber` | string | No | Receipt reference |
| `subcategory` | string | No | Subcategory |
| `notes` | string | No | Additional notes |
| `tags` | array | No | Tags for categorization |

### GET /api/cost/expenses
Get all expenses with filtering and pagination.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `projectId` | UUID | Filter by project |
| `budgetId` | UUID | Filter by budget |
| `taskId` | UUID | Filter by task |
| `category` | string | Filter by category |
| `status` | string | Filter by status |
| `vendor` | string | Filter by vendor |
| `startDate` | ISO date | Date range start |
| `endDate` | ISO date | Date range end |
| `minAmount` | number | Minimum amount |
| `maxAmount` | number | Maximum amount |
| `sortBy` | string | Sort field (default: `date`) |
| `sortOrder` | string | `ASC` or `DESC` (default: `DESC`) |

### GET /api/cost/expenses/:id
Get a single expense with project, budget, and task details.

**Auth Required:** Yes

### PUT /api/cost/expenses/:id
Update an expense. Non-admin users can only modify `PENDING` expenses.

**Auth Required:** Yes

### DELETE /api/cost/expenses/:id
Soft-delete an expense. Paid expenses cannot be deleted.

**Auth Required:** Yes

### PATCH /api/cost/expenses/:id/approve
Approve a pending expense.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Business Rules:**
- Only `PENDING` expenses can be approved
- Records approver and approval timestamp

### PATCH /api/cost/expenses/:id/reject
Reject a pending expense.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Rejection reason (required) |

### PATCH /api/cost/expenses/:id/pay
Mark an approved expense as paid.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentDate` | ISO date | No | Payment date (defaults to now) |
| `paymentReference` | string | No | Payment reference number |
| `paymentMethod` | string | No | Payment method (e.g., CHECK, WIRE) |

**Business Rules:**
- Only `APPROVED` expenses can be marked as paid

### POST /api/cost/expenses/bulk-approve
Approve multiple expenses in a single request.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `PROJECT_MANAGER`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expenseIds` | UUID[] | Yes | Array of expense IDs to approve |
| `notes` | string | No | Approval notes applied to all |

**Response (200):**
```json
{
  "success": true,
  "message": "Approved 3 expenses",
  "data": {
    "approved": ["uuid1", "uuid2", "uuid3"],
    "failed": [
      { "id": "uuid4", "reason": "Invalid status: APPROVED" }
    ]
  }
}
```

### GET /api/cost/expenses/summary/:projectId
Get expense summary for a project grouped by category and status.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Date range start |
| `endDate` | ISO date | Date range end |

---

## Cost Analysis Endpoints

### GET /api/cost/analysis/overview/:projectId
Get a comprehensive cost overview for a project.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "projectName": "Construction Project",
    "overview": {
      "totalBudget": 500000,
      "totalApproved": 125000,
      "totalPending": 30000,
      "totalPaid": 80000,
      "remaining": 375000,
      "costVariance": 375000,
      "budgetUtilization": 25.0,
      "isOverBudget": false
    },
    "budgetCount": 2,
    "expenseCount": 15
  }
}
```

### GET /api/cost/analysis/evm/:projectId
Get Earned Value Management (EVM) metrics for a project.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `asOfDate` | ISO date | Report date (default: now) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "projectName": "Construction Project",
    "asOfDate": "2025-03-01T00:00:00.000Z",
    "baseMetrics": {
      "BAC": 500000,
      "PV": 250000,
      "EV": 200000,
      "AC": 180000
    },
    "variances": {
      "CV": 20000,
      "SV": -50000,
      "costStatus": "Under Budget",
      "scheduleStatus": "Behind Schedule"
    },
    "indices": {
      "CPI": 1.111,
      "SPI": 0.8
    },
    "forecasts": {
      "EAC": 450045,
      "ETC": 270045,
      "VAC": 49955,
      "TCPI": 0.938
    },
    "progress": {
      "plannedProgress": 50.0,
      "actualProgress": 40.0,
      "percentComplete": 40.0,
      "percentSpent": 36.0
    },
    "health": {
      "costHealth": "Good",
      "scheduleHealth": "Warning",
      "overallHealth": "Warning"
    }
  }
}
```

**EVM Metrics Explained:**
| Metric | Name | Description |
|--------|------|-------------|
| BAC | Budget at Completion | Total approved budget |
| PV | Planned Value | Budgeted cost of work scheduled |
| EV | Earned Value | Budgeted cost of work performed |
| AC | Actual Cost | Actual cost of work performed |
| CV | Cost Variance | EV - AC (positive = under budget) |
| SV | Schedule Variance | EV - PV (positive = ahead of schedule) |
| CPI | Cost Performance Index | EV / AC (>1 = under budget) |
| SPI | Schedule Performance Index | EV / PV (>1 = ahead of schedule) |
| EAC | Estimate at Completion | BAC / CPI |
| ETC | Estimate to Complete | EAC - AC |
| VAC | Variance at Completion | BAC - EAC |
| TCPI | To-Complete Performance Index | CPI needed to finish on budget |

### GET /api/cost/analysis/breakdown/:projectId
Get cost breakdown by category (or custom field).

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Date range start |
| `endDate` | ISO date | Date range end |
| `groupBy` | string | Field to group by (default: `category`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "projectName": "Construction Project",
    "groupedBy": "category",
    "totalAmount": 155000,
    "breakdown": [
      { "category": "MATERIAL", "count": 5, "totalAmount": 80000, "approved": 60000, "pending": 15000, "paid": 5000, "rejected": 0, "percentage": 51.61 },
      { "category": "LABOR", "count": 3, "totalAmount": 45000, "approved": 30000, "pending": 10000, "paid": 5000, "rejected": 0, "percentage": 29.03 }
    ]
  }
}
```

### GET /api/cost/analysis/trend/:projectId
Get cost spending trend over time.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Date range start |
| `endDate` | ISO date | Date range end |
| `interval` | string | Grouping interval: `day`, `week`, `month` (default: `month`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "projectName": "Construction Project",
    "interval": "month",
    "totalAmount": 155000,
    "trend": [
      { "period": "2025-01", "amount": 45000, "count": 5, "cumulative": 45000 },
      { "period": "2025-02", "amount": 60000, "count": 8, "cumulative": 105000 },
      { "period": "2025-03", "amount": 50000, "count": 6, "cumulative": 155000 }
    ]
  }
}
```

### GET /api/cost/analysis/compare
Compare costs across multiple projects.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectIds` | string | Yes | Comma-separated project UUIDs |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectCount": 2,
    "comparison": [
      {
        "projectId": "uuid1",
        "projectName": "Project A",
        "status": "IN_PROGRESS",
        "budget": 500000,
        "spent": 125000,
        "remaining": 375000,
        "utilization": 25.0,
        "expenseCount": 15,
        "isOverBudget": false
      },
      {
        "projectId": "uuid2",
        "projectName": "Project B",
        ...
      }
    ]
  }
}
```

### GET /api/cost/analysis/forecast/:projectId
Get cost spending forecast based on current burn rate.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "projectName": "Construction Project",
    "budget": 500000,
    "spent": 125000,
    "remaining": 375000,
    "spendingRates": {
      "daily": 2083.33,
      "weekly": 14583.33,
      "monthly": 62500
    },
    "forecast": {
      "daysUntilBudgetExhausted": 180,
      "budgetExhaustionDate": "2025-09-01",
      "forecastedTotalCost": 450000,
      "projectEndDate": "2025-06-30",
      "willExceedBudget": false,
      "potentialOverage": -50000
    },
    "analysisBasedOn": {
      "expenseCount": 15,
      "firstExpenseDate": "2025-01-15",
      "lastExpenseDate": "2025-03-01",
      "analyzedDays": 45
    }
  }
}
```

---

## Status Lifecycles

### Cost Status Flow
```
PENDING → APPROVED → PAID
       → REJECTED
```

### Budget Status Flow
```
PLANNED → APPROVED → CLOSED
        → REVISED → (creates new PLANNED budget)
```

### Expense Status Flow
```
PENDING → APPROVED → PAID
        → REJECTED
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

| Status Code | Description |
|-------------|-------------|
| 400 | Missing required fields or invalid input |
| 401 | Authentication required |
| 403 | Insufficient permissions or business rule violation |
| 404 | Resource not found |
| 500 | Internal server error |
