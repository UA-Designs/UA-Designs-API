# Project Integration Management API

## Overview
The Project Integration Management API provides comprehensive functionality for managing project charters, change requests, and project closure processes. This system aligns with PMBOK standards and ensures proper project governance throughout the project lifecycle.

## Base URL
```
http://localhost:5000/api/integration
```

## 📋 Complete API Endpoints

### Project Charter Management
- `POST /charters` - Create project charter
- `GET /charters` - List all project charters
- `GET /charters/:id` - Get specific project charter
- `PUT /charters/:id` - Update project charter
- `POST /charters/:id/submit` - Submit charter for approval
- `POST /charters/:id/review` - Review/approve charter

### Change Request Management
- `POST /change-requests` - Create change request
- `GET /change-requests` - List all change requests
- `GET /change-requests/:id` - Get specific change request
- `POST /change-requests/:id/submit` - Submit for review
- `POST /change-requests/:id/review` - CCB review
- `PATCH /change-requests/:id/approve` - Approve change request

### Project Closure Management
- `POST /closures` - Initiate project closure
- `GET /closures` - List all project closures
- `GET /closures/:id` - Get specific project closure
- `PUT /closures/:id` - Update project closure
- `POST /closures/:id/complete` - Complete project closure
- `POST /project-closures` - Create closure document (alternative)
- `GET /project-closures` - List closures (alternative)

### Construction Templates
- `GET /templates/charter/construction` - Construction charter template
- `GET /templates/change-request/construction` - Construction change request template

### Intelligent Routing
- `GET /approval-routing/:changeRequestId` - Get approval routing based on impact

### Dashboard
- `GET /dashboard` - Integration management dashboard

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🏗️ Project Charter Management

### Create Project Charter
**POST** `/charters`

Creates a new project charter for project authorization and high-level planning.

**Required Fields:**
- `projectId` - UUID of the project
- `charterNumber` - Unique charter identifier
- `projectTitle` - Project title
- `projectDescription` - Project description
- `projectObjectives` - Array of project objectives
- `successCriteria` - Array of success criteria
- `projectDeliverables` - Array of project deliverables
- `projectSponsor` - UUID of project sponsor
- `projectManager` - UUID of project manager

**Optional Fields:**
- `businessCase` - Business justification
- `highLevelRequirements` - Array of high-level requirements
- `projectScope` - Project scope description
- `projectConstraints` - Array of project constraints
- `projectAssumptions` - Array of project assumptions
- `highLevelRisks` - Array of high-level risks
- `summaryMilestoneSchedule` - Array of milestone schedules
- `summaryBudget` - High-level budget estimate
- `keyStakeholders` - Array of stakeholder IDs

**Request Body:**
```json
{
  "projectId": "uuid",
  "charterNumber": "CH-2024-001",
  "projectTitle": "New Office Building Construction",
  "projectDescription": "Construction of a 10-story office building",
  "projectObjectives": [
    "Complete construction within 18 months",
    "Stay within budget of $15M",
    "Achieve LEED Gold certification"
  ],
  "successCriteria": [
    "Building completed on time",
    "Budget variance < 5%",
    "Zero safety incidents"
  ],
  "projectDeliverables": [
    "Completed office building",
    "As-built drawings",
    "Operation and maintenance manual"
  ],
  "projectSponsor": "uuid",
  "projectManager": "uuid",
  "summaryBudget": 15000000,
  "keyStakeholders": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project charter created successfully",
  "data": {
    "id": "uuid",
    "charterNumber": "CH-2024-001",
    "projectTitle": "New Office Building Construction",
    "approvalStatus": "DRAFT",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Project Charters
**GET** `/charters`

Retrieves all project charters with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by approval status
- `projectId` - Filter by project ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "charterNumber": "CH-2024-001",
      "projectTitle": "New Office Building Construction",
      "approvalStatus": "APPROVED",
      "project": {
        "id": "uuid",
        "name": "Office Building Project",
        "status": "ACTIVE"
      },
      "sponsor": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@company.com"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  }
}
```

### Get Specific Project Charter
**GET** `/charters/:id`

Retrieves a specific project charter by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "charterNumber": "CH-2024-001",
    "projectTitle": "New Office Building Construction",
    "projectDescription": "Construction of a 10-story office building",
    "projectObjectives": ["Complete construction within 18 months"],
    "successCriteria": ["Building completed on time"],
    "projectDeliverables": ["Completed office building"],
    "approvalStatus": "APPROVED",
    "project": {
      "id": "uuid",
      "name": "Office Building Project",
      "status": "ACTIVE",
      "description": "Project description"
    },
    "sponsor": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@company.com",
      "role": "PROJECT_SPONSOR"
    }
  }
}
```

### Update Project Charter
**PUT** `/charters/:id`

Updates a project charter (only allowed in DRAFT status).

**Request Body:**
```json
{
  "projectDescription": "Updated project description",
  "projectObjectives": ["Updated objective 1", "Updated objective 2"]
}
```

### Submit Charter for Approval
**POST** `/charters/:id/submit`

Submits a draft charter for approval.

**Response:**
```json
{
  "success": true,
  "message": "Project charter submitted for approval",
  "data": {
    "id": "uuid",
    "approvalStatus": "PENDING_APPROVAL"
  }
}
```

### Review Charter
**POST** `/charters/:id/review`

Approves or rejects a charter (requires ADMIN or PROJECT_SPONSOR role).

**Request Body:**
```json
{
  "decision": "APPROVED",
  "comments": "Charter approved after review"
}
```

---

## 🔄 Change Request Management

### Create Change Request
**POST** `/change-requests`

Creates a new change request for project modifications.

**Required Fields:**
- `projectId` - UUID of the project
- `changeRequestNumber` - Unique change request identifier
- `title` - Change request title
- `description` - Detailed description
- `changeType` - Type of change (SCOPE, SCHEDULE, COST, QUALITY, RESOURCE, TECHNICAL, OTHER)
- `businessJustification` - Business case for the change

**Optional Fields:**
- `priority` - Priority level (LOW, MEDIUM, HIGH, CRITICAL)
- `impactLevel` - Impact level (LOW, MEDIUM, HIGH, CRITICAL)
- `impactAnalysis` - Detailed impact analysis
- `costImpact` - Cost impact amount
- `scheduleImpact` - Schedule impact in days
- `scopeImpact` - Scope impact description
- `qualityImpact` - Quality impact description
- `riskImpact` - Risk impact description
- `alternativesConsidered` - Array of alternatives
- `recommendedSolution` - Recommended solution
- `implementationPlan` - Implementation steps

**Request Body:**
```json
{
  "projectId": "uuid",
  "changeRequestNumber": "CR-2024-001",
  "title": "Add Solar Panel Installation",
  "description": "Install solar panels on the roof for energy efficiency",
  "changeType": "SCOPE",
  "priority": "HIGH",
  "impactLevel": "MEDIUM",
  "businessJustification": "Improve building sustainability and reduce energy costs",
  "costImpact": 500000,
  "scheduleImpact": 30,
  "scopeImpact": "Additional scope for solar installation",
  "recommendedSolution": "Install 200kW solar panel system"
}
```

### Get All Change Requests
**GET** `/change-requests`

Retrieves all change requests with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by current status
- `projectId` - Filter by project ID
- `changeType` - Filter by change type
- `priority` - Filter by priority

### Submit Change Request for Review
**POST** `/change-requests/:id/submit`

Submits a draft change request for review.

### Review Change Request
**POST** `/change-requests/:id/review`

Reviews and approves/rejects a change request (requires ADMIN, PROJECT_MANAGER, or CHANGE_CONTROL_BOARD role).

**Request Body:**
```json
{
  "decision": "APPROVED",
  "comments": "Change approved after CCB review",
  "ccbReviewDate": "2024-01-15T00:00:00.000Z"
}
```

### Approve Change Request (Alternative)
**PATCH** `/change-requests/:id/approve`

Alternative endpoint for approving change requests (requires ADMIN, PROJECT_MANAGER, or CHANGE_CONTROL_BOARD role).

**Request Body:**
```json
{
  "decision": "APPROVED",
  "comments": "Change approved after review",
  "ccbReviewDate": "2024-01-15T00:00:00.000Z"
}
```

---

## 🏁 Project Closure Management

### Initiate Project Closure
**POST** `/closures`

Initiates the project closure process.

**Alternative Endpoint:**
**POST** `/project-closures`

Creates a project closure document (same functionality as `/closures` but matches the required API endpoint naming).

**Required Fields:**
- `projectId` - UUID of the project
- `closureNumber` - Unique closure identifier
- `closureType` - Type of closure (NORMAL, EARLY_TERMINATION, PHASE_CLOSURE, MILESTONE_CLOSURE)
- `closureDate` - Closure date
- `closureReason` - Reason for closure
- `deliverablesStatus` - Array of deliverable statuses

**Optional Fields:**
- `originalBudget` - Original project budget
- `originalSchedule` - Original project schedule

**Request Body:**
```json
{
  "projectId": "uuid",
  "closureNumber": "CL-2024-001",
  "closureType": "NORMAL",
  "closureDate": "2024-12-31T00:00:00.000Z",
  "closureReason": "Project completed successfully",
  "deliverablesStatus": [
    {
      "deliverable": "Office Building",
      "status": "COMPLETED",
      "completionDate": "2024-12-15T00:00:00.000Z"
    }
  ],
  "originalBudget": 15000000,
  "originalSchedule": "2024-06-30T00:00:00.000Z"
}
```

### Get All Project Closures
**GET** `/closures`

Retrieves all project closures with pagination and filtering.

**Alternative Endpoint:**
**GET** `/project-closures`

Same functionality as `/closures` but matches the required API endpoint naming.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by closure status
- `projectId` - Filter by project ID
- `closureType` - Filter by closure type

### Complete Project Closure
**POST** `/closures/:id/complete`

Completes the project closure process with final metrics.

**Request Body:**
```json
{
  "finalBudget": 15200000,
  "actualCompletionDate": "2024-12-15T00:00:00.000Z",
  "scopeCompletion": 100.0,
  "lessonsLearned": [
    "Early stakeholder engagement improved project success",
    "Regular progress reviews helped identify issues early"
  ],
  "stakeholderSatisfaction": {
    "client": 9.5,
    "team": 8.8,
    "sponsor": 9.0
  }
}
```

---

## 🏗️ Construction-Specific Templates

### Get Construction Project Charter Template
**GET** `/templates/charter/construction`

Retrieves a pre-filled template for construction project charters with industry-specific objectives, success criteria, deliverables, risks, and constraints.

**Response:**
```json
{
  "success": true,
  "data": {
    "projectType": "CONSTRUCTION",
    "templateName": "Standard Construction Project Charter",
    "sections": {
      "projectObjectives": [
        "Complete construction within specified timeline",
        "Maintain safety standards throughout project",
        "Achieve quality benchmarks per specifications"
      ],
      "successCriteria": [
        "Zero safety incidents",
        "Quality inspection pass rate >95%",
        "Budget variance <5%"
      ]
    }
  }
}
```

### Get Construction Change Request Template
**GET** `/templates/change-request/construction`

Retrieves a template for construction change requests with industry-specific impact analysis, alternatives, and implementation plans.

## 🎯 Intelligent Approval Routing

### Get Approval Routing Based on Change Impact
**GET** `/approval-routing/:changeRequestId`

Determines the appropriate approval route based on the change request's impact level, priority, and type. Provides intelligent routing for construction-specific requirements.

**Response:**
```json
{
  "success": true,
  "data": {
    "changeRequest": {
      "id": "uuid",
      "title": "Structural Modification",
      "impactLevel": "HIGH",
      "priority": "HIGH",
      "changeType": "SCOPE"
    },
    "approvalRoute": {
      "requiresCCB": true,
      "requiresSponsor": false,
      "requiresSafetyReview": true,
      "requiresEngineeringReview": true,
      "estimatedReviewTime": "5-10 business days"
    }
  }
}
```

## 📊 Integration Dashboard

### Get Integration Dashboard Data
**GET** `/dashboard`

Retrieves comprehensive integration management dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCharters": 15,
      "totalChangeRequests": 23,
      "totalClosures": 8,
      "pendingApprovals": 3,
      "pendingChanges": 5,
      "activeClosures": 2
    },
    "recentActivity": {
      "charters": [
        {
          "id": "uuid",
          "charterNumber": "CH-2024-015",
          "projectTitle": "Latest Project",
          "approvalStatus": "PENDING_APPROVAL",
          "project": {
            "id": "uuid",
            "name": "Latest Project"
          }
        }
      ],
      "changeRequests": [
        {
          "id": "uuid",
          "changeRequestNumber": "CR-2024-023",
          "title": "Latest Change",
          "currentStatus": "SUBMITTED",
          "project": {
            "id": "uuid",
            "name": "Project Name"
          }
        }
      ]
    }
  }
}
```

---

## 🔐 Role-Based Access Control

### Project Charter Operations
- **Create/Update**: ADMIN, PROJECT_MANAGER
- **Submit for Approval**: ADMIN, PROJECT_MANAGER
- **Approve/Reject**: ADMIN, PROJECT_SPONSOR

### Change Request Operations
- **Create**: All authenticated users
- **Submit for Review**: All authenticated users
- **Review/Approve**: ADMIN, PROJECT_MANAGER, CHANGE_CONTROL_BOARD

### Project Closure Operations
- **Initiate**: ADMIN, PROJECT_MANAGER
- **Update**: ADMIN, PROJECT_MANAGER
- **Complete**: ADMIN, PROJECT_MANAGER

---

## 📋 Status Enums

### Charter Approval Status
- `DRAFT` - Initial draft state
- `PENDING_APPROVAL` - Submitted for approval
- `APPROVED` - Approved by sponsor
- `REJECTED` - Rejected by sponsor

### Change Request Status
- `DRAFT` - Initial draft state
- `SUBMITTED` - Submitted for review
- `UNDER_REVIEW` - Under CCB review
- `APPROVED` - Approved by CCB
- `REJECTED` - Rejected by CCB
- `IMPLEMENTED` - Change implemented
- `CLOSED` - Change request closed

### Closure Status
- `INITIATED` - Closure process initiated
- `IN_PROGRESS` - Closure in progress
- `PENDING_APPROVAL` - Pending approval
- `APPROVED` - Closure approved
- `COMPLETED` - Closure completed

---

## 🚀 Usage Examples

### Complete Project Charter Workflow
1. **Create Charter**: POST `/charters`
2. **Update Charter**: PUT `/charters/:id`
3. **Submit for Approval**: POST `/charters/:id/submit`
4. **Review/Approve**: POST `/charters/:id/review`

### Complete Change Request Workflow
1. **Create Change Request**: POST `/change-requests`
2. **Submit for Review**: POST `/change-requests/:id/submit`
3. **CCB Review**: POST `/change-requests/:id/review`
4. **Implementation**: Update status to IMPLEMENTED

### Complete Project Closure Workflow
1. **Initiate Closure**: POST `/closures`
2. **Update Closure Details**: PUT `/closures/:id`
3. **Complete Closure**: POST `/closures/:id/complete`

---

## 🔍 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📚 Related Documentation
- [User Management API](./USER_MANAGEMENT_API.md)
- [Project Management API](./PROJECT_MANAGEMENT_API.md)
- [Authentication Guide](./AUTHENTICATION.md)

---

## 🆘 Support
For technical support or questions about the Integration Management API, please contact the development team or create an issue in the project repository.
