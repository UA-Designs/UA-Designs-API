# Project Management API Documentation

## Overview
Complete Project Management system for UA Designs PMS with construction-specific features and PMBOK-aligned project lifecycle management.

## Base URL
```
http://localhost:5000/api/projects
```

## Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Project Types
- **RESIDENTIAL** - Residential construction projects
- **COMMERCIAL** - Commercial building projects
- **INDUSTRIAL** - Industrial construction projects
- **INFRASTRUCTURE** - Infrastructure and civil projects
- **RENOVATION** - Renovation and remodeling projects

## Project Status
- **PROPOSAL** - Project proposal stage
- **PLANNING** - Project planning and design
- **IN_PROGRESS** - Active construction
- **ON_HOLD** - Project temporarily suspended
- **COMPLETED** - Project finished
- **CANCELLED** - Project cancelled

## Project Phases
- **INITIATION** - Project initiation
- **PLANNING** - Project planning
- **EXECUTION** - Project execution
- **MONITORING** - Project monitoring and control
- **CLOSURE** - Project closure

## Endpoints

### 1. Health Check
```http
GET /api/projects/health
```
**Response:**
```json
{
  "status": "OK",
  "service": "UA Designs Project Management Service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get All Projects
```http
GET /api/projects?page=1&limit=10&status=IN_PROGRESS&projectType=RESIDENTIAL&search=complex
```
**Access:** All authenticated users

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by project status
- `projectType` (optional): Filter by project type
- `phase` (optional): Filter by project phase
- `projectManagerId` (optional): Filter by project manager
- `search` (optional): Search in name, project number, client name, description
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "projectNumber": "UA-202401001",
        "name": "Residential Complex A",
        "description": "Modern residential complex with 50 units",
        "projectType": "RESIDENTIAL",
        "status": "IN_PROGRESS",
        "phase": "EXECUTION",
        "startDate": "2024-01-15T00:00:00.000Z",
        "plannedEndDate": "2024-08-30T00:00:00.000Z",
        "budget": 2500000,
        "actualCost": 1800000,
        "clientName": "ABC Development Corp",
        "projectManager": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@uadesigns.com",
          "role": "PROJECT_MANAGER"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProjects": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3. Get Project by ID
```http
GET /api/projects/:id
```
**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "projectNumber": "UA-202401001",
      "name": "Residential Complex A",
      "description": "Modern residential complex with 50 units",
      "projectType": "RESIDENTIAL",
      "status": "IN_PROGRESS",
      "phase": "EXECUTION",
      "projectManagerId": "uuid",
      "clientName": "ABC Development Corp",
      "clientEmail": "contact@abcdev.com",
      "clientPhone": "+1234567890",
      "clientAddress": "123 Client Street, City",
      "projectLocation": {
        "address": "123 Downtown Street",
        "city": "Metro City",
        "coordinates": { "lat": 14.5995, "lng": 120.9842 },
        "siteArea": "5000 sqm"
      },
      "startDate": "2024-01-15T00:00:00.000Z",
      "plannedEndDate": "2024-08-30T00:00:00.000Z",
      "actualEndDate": null,
      "budget": 2500000,
      "actualCost": 1800000,
      "estimatedCost": 2500000,
      "scope": {
        "included": ["Foundation", "Framing", "Roofing", "Interior"],
        "excluded": ["Landscaping", "Furniture"]
      },
      "deliverables": ["50 Residential Units", "Parking Area", "Common Areas"],
      "qualityObjectives": ["High-quality finishes", "Energy efficient"],
      "resourceRequirements": {
        "materials": ["Concrete", "Steel", "Lumber"],
        "equipment": ["Crane", "Excavator"],
        "labor": ["Carpenters", "Electricians", "Plumbers"],
        "subcontractors": ["Electrical Contractor", "Plumbing Contractor"]
      },
      "riskRegister": [
        {
          "id": "risk-001",
          "name": "Weather Delays",
          "probability": 0.3,
          "impact": 0.7,
          "mitigation": "Schedule buffer time"
        }
      ],
      "buildingPermits": ["BP-2024-001", "BP-2024-002"],
      "siteConditions": {
        "soilType": "Clay",
        "drainage": "Good",
        "access": "Easy"
      },
      "safetyRequirements": ["OSHA compliant", "Safety training required"],
      "priority": "HIGH",
      "projectManager": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@uadesigns.com",
        "role": "PROJECT_MANAGER"
      },
      "tasks": [
        {
          "id": "uuid",
          "name": "Foundation Work",
          "status": "COMPLETED",
          "progress": 100,
          "priority": "HIGH",
          "plannedStartDate": "2024-01-20T00:00:00.000Z",
          "plannedEndDate": "2024-02-15T00:00:00.000Z",
          "assignedTo": {
            "id": "uuid",
            "firstName": "Mike",
            "lastName": "Smith"
          }
        }
      ]
    }
  }
}
```

### 4. Create New Project
```http
POST /api/projects
```
**Access:** Admin, Project Manager only

**Request Body:**
```json
{
  "name": "Residential Complex A",
  "description": "Modern residential complex with 50 units",
  "projectType": "RESIDENTIAL",
  "clientName": "ABC Development Corp",
  "clientEmail": "contact@abcdev.com",
  "clientPhone": "+1234567890",
  "clientAddress": "123 Client Street, City",
  "projectLocation": {
    "address": "123 Downtown Street",
    "city": "Metro City",
    "coordinates": { "lat": 14.5995, "lng": 120.9842 },
    "siteArea": "5000 sqm"
  },
  "startDate": "2024-01-15",
  "plannedEndDate": "2024-08-30",
  "budget": 2500000,
  "estimatedCost": 2500000,
  "scope": {
    "included": ["Foundation", "Framing", "Roofing", "Interior"],
    "excluded": ["Landscaping", "Furniture"]
  },
  "deliverables": ["50 Residential Units", "Parking Area", "Common Areas"],
  "qualityObjectives": ["High-quality finishes", "Energy efficient"],
  "resourceRequirements": {
    "materials": ["Concrete", "Steel", "Lumber"],
    "equipment": ["Crane", "Excavator"],
    "labor": ["Carpenters", "Electricians", "Plumbers"],
    "subcontractors": ["Electrical Contractor", "Plumbing Contractor"]
  },
  "buildingPermits": ["BP-2024-001"],
  "siteConditions": {
    "soilType": "Clay",
    "drainage": "Good",
    "access": "Easy"
  },
  "safetyRequirements": ["OSHA compliant", "Safety training required"],
  "priority": "HIGH"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": "uuid",
      "projectNumber": "UA-202401001",
      "name": "Residential Complex A",
      "projectType": "RESIDENTIAL",
      "status": "PROPOSAL",
      "phase": "INITIATION",
      "projectManagerId": "uuid",
      "budget": 2500000,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 5. Update Project
```http
PUT /api/projects/:id
```
**Access:** Project Manager (own projects), Admin (all projects)

**Request Body:**
```json
{
  "name": "Residential Complex A - Updated",
  "description": "Updated description",
  "budget": 2600000,
  "plannedEndDate": "2024-09-15",
  "status": "PLANNING",
  "phase": "PLANNING"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "project": {
      "id": "uuid",
      "name": "Residential Complex A - Updated",
      "budget": 2600000,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 6. Update Project Status
```http
PATCH /api/projects/:id/status
```
**Access:** Project Manager (own projects), Admin (all projects)

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "phase": "EXECUTION",
  "actualEndDate": "2024-09-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project status updated successfully",
  "data": {
    "project": {
      "id": "uuid",
      "status": "IN_PROGRESS",
      "phase": "EXECUTION",
      "actualEndDate": "2024-09-15T00:00:00.000Z"
    }
  }
}
```

### 7. Assign Project Manager
```http
PATCH /api/projects/:id/assign-manager
```
**Access:** Admin, Project Manager only

**Request Body:**
```json
{
  "projectManagerId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project manager assigned successfully",
  "data": {
    "project": {
      "id": "uuid",
      "projectManagerId": "uuid"
    }
  }
}
```

### 8. Delete Project
```http
DELETE /api/projects/:id
```
**Access:** Admin only (soft delete)

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### 9. Get Project Statistics
```http
GET /api/projects/stats/overview
```
**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProjects": 25,
    "activeProjects": 8,
    "completedProjects": 15,
    "planningProjects": 2,
    "recentProjects": 3,
    "typeStats": {
      "RESIDENTIAL": 12,
      "COMMERCIAL": 8,
      "INDUSTRIAL": 3,
      "INFRASTRUCTURE": 2
    },
    "statusStats": {
      "IN_PROGRESS": 8,
      "COMPLETED": 15,
      "PLANNING": 2
    },
    "budgetStats": {
      "totalBudget": 50000000,
      "totalActualCost": 35000000
    }
  }
}
```

### 10. Get Projects by Status
```http
GET /api/projects/status/IN_PROGRESS
```
**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Residential Complex A",
        "status": "IN_PROGRESS",
        "projectManager": {
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ]
  }
}
```

### 11. Get Projects by Type
```http
GET /api/projects/type/RESIDENTIAL
```
**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Residential Complex A",
        "projectType": "RESIDENTIAL",
        "projectManager": {
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ]
  }
}
```

### 12. Get User's Projects
```http
GET /api/projects/user/:userId
```
**Access:** Own projects, Admin (all projects)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Residential Complex A",
        "status": "IN_PROGRESS",
        "projectManager": {
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ]
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: name, projectType, clientName",
  "missingFields": ["name", "projectType", "clientName"]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Only project manager or admin can update this project"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Project not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch projects",
  "error": "Detailed error message"
}
```

## Construction-Specific Features

1. **Project Types**: Residential, Commercial, Industrial, Infrastructure, Renovation
2. **Building Permits**: Track all required permits and approvals
3. **Site Conditions**: Document soil conditions, drainage, access
4. **Weather Considerations**: Plan for weather-dependent activities
5. **Safety Requirements**: OSHA compliance and safety protocols
6. **Resource Requirements**: Materials, equipment, labor, subcontractors
7. **Quality Objectives**: Construction quality standards and metrics
8. **Risk Register**: Construction-specific risks and mitigation strategies
9. **Stakeholder Management**: Client, contractors, suppliers, inspectors
10. **Project Location**: GPS coordinates, site area, address details

## PMBOK Integration

1. **Project Integration Management**: Project charter, change management
2. **Project Scope Management**: Scope definition, deliverables, exclusions
3. **Project Time Management**: Start/end dates, milestones, dependencies
4. **Project Cost Management**: Budget, actual costs, cost breakdown
5. **Project Quality Management**: Quality objectives and metrics
6. **Project Resource Management**: Resource requirements and allocation
7. **Project Communications Management**: Communication plan and stakeholders
8. **Project Risk Management**: Risk register and mitigation strategies
9. **Project Procurement Management**: Procurement plan and vendors
10. **Project Stakeholder Management**: Stakeholder register and engagement

