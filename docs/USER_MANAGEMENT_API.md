# User Management API Documentation

## Overview
Complete User Management system for UA Designs PMS with role-based access control and UA Designs-specific roles.

## Base URL
```
http://localhost:5000/api/users
```

## Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## UA Designs Roles
- **CIVIL_ENGINEER** - Materials, methodology, worker assignments
- **ARCHITECT** - Design and finishing materials  
- **SITE_ENGINEER** - Progress tracking and site supervision
- **JUNIOR_ARCHITECT** - Detail development and supervision
- **APPRENTICE_ARCHITECT** - Detail development and supervision
- **BOOKKEEPER** - Payroll and finance
- **SECRETARY** - Liaison work and external transactions
- **PROJECT_MANAGER** - Overall project coordination
- **ADMIN** - System administration

## Endpoints

### 1. Health Check
```http
GET /api/users/health
```
**Response:**
```json
{
  "status": "OK",
  "service": "UA Designs User Management Service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get All Users
```http
GET /api/users?page=1&limit=10&role=ARCHITECT&search=john
```
**Access:** Admin, Project Manager only

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role
- `department` (optional): Filter by department
- `isActive` (optional): Filter by active status (true/false)
- `search` (optional): Search in name, email, employeeId
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@uadesigns.com",
        "role": "ARCHITECT",
        "employeeId": "EMP001",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3. Get User by ID
```http
GET /api/users/:id
```
**Access:** Own profile, Admin, Project Manager

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@uadesigns.com",
      "role": "ARCHITECT",
      "employeeId": "EMP001",
      "phone": "+1234567890",
      "department": "Design",
      "hireDate": "2023-01-15T00:00:00.000Z",
      "isActive": true,
      "permissions": {
        "design": ["read", "write", "approve"],
        "finishingMaterials": ["read", "write", "approve"]
      },
      "workSchedule": {
        "monday": {"start": "08:00", "end": "17:00", "available": true}
      },
      "specializations": ["Residential Design", "Commercial Architecture"],
      "approvalLevel": "HIGH",
      "costCenter": "DESIGN-001",
      "officeLocation": "Main Office",
      "assignedEquipment": ["Laptop", "Drawing Tablet"],
      "certifications": ["Licensed Architect", "LEED Certified"]
    }
  }
}
```

### 4. Create New User
```http
POST /api/users
```
**Access:** Admin only

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@uadesigns.com",
  "password": "securePassword123",
  "phone": "+1234567890",
  "role": "ARCHITECT",
  "department": "Design",
  "employeeId": "EMP001",
  "hireDate": "2024-01-15",
  "profileImage": "profile.jpg",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+1234567891",
    "relationship": "Spouse"
  },
  "workSchedule": {
    "monday": {"start": "08:00", "end": "17:00", "available": true}
  },
  "specializations": ["Residential Design"],
  "approvalLevel": "HIGH",
  "costCenter": "DESIGN-001",
  "officeLocation": "Main Office",
  "assignedEquipment": ["Laptop"],
  "certifications": ["Licensed Architect"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@uadesigns.com",
      "role": "ARCHITECT",
      "employeeId": "EMP001",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 5. Update User
```http
PUT /api/users/:id
```
**Access:** Own profile, Admin (full access)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "department": "Design",
  "newPassword": "newSecurePassword123",
  "specializations": ["Residential Design", "Commercial Architecture"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.doe@uadesigns.com",
      "role": "ARCHITECT",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 6. Deactivate User
```http
PATCH /api/users/:id/deactivate
```
**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### 7. Activate User
```http
PATCH /api/users/:id/activate
```
**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "User activated successfully"
}
```

### 8. Delete User
```http
DELETE /api/users/:id
```
**Access:** Admin only (soft delete)

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 9. Get Users by Role
```http
GET /api/users/role/ARCHITECT
```
**Access:** Admin, Project Manager

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@uadesigns.com",
        "role": "ARCHITECT",
        "employeeId": "EMP001"
      }
    ]
  }
}
```

### 10. Get User Permissions
```http
GET /api/users/:id/permissions
```
**Access:** Own permissions, Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "role": "ARCHITECT",
    "permissions": {
      "design": ["read", "write", "approve"],
      "finishingMaterials": ["read", "write", "approve"],
      "clientApproval": ["read", "write", "approve"]
    },
    "approvalLevel": "HIGH",
    "isApprover": true,
    "canApproveMaterials": false,
    "canApproveFinishingMaterials": true
  }
}
```

### 11. Update User Permissions
```http
PUT /api/users/:id/permissions
```
**Access:** Admin only

**Request Body:**
```json
{
  "permissions": {
    "design": ["read", "write", "approve"],
    "finishingMaterials": ["read", "write", "approve"]
  },
  "approvalLevel": "HIGH"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User permissions updated successfully"
}
```

### 12. Get User Statistics
```http
GET /api/users/stats/overview
```
**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 50,
    "activeUsers": 45,
    "inactiveUsers": 5,
    "recentUsers": 3,
    "roleStats": {
      "ARCHITECT": 8,
      "CIVIL_ENGINEER": 5,
      "SITE_ENGINEER": 12,
      "PROJECT_MANAGER": 3,
      "ADMIN": 2
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Required fields: firstName, lastName, email, password, role"
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
  "message": "You can only view your own profile"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch users",
  "error": "Detailed error message"
}
```

## Security Features

1. **Password Hashing:** All passwords are hashed using bcrypt with 12 rounds
2. **JWT Authentication:** Secure token-based authentication
3. **Role-Based Access Control:** Different access levels based on UA Designs roles
4. **Permission System:** Granular permissions for different modules
5. **Soft Deletes:** Users are soft deleted, not permanently removed
6. **Input Validation:** Comprehensive validation for all inputs
7. **Self-Protection:** Admins cannot delete/deactivate themselves

## UA Designs Specific Features

1. **Construction Roles:** Specialized roles for construction industry
2. **Approval Levels:** Material and finishing material approval workflows
3. **Equipment Assignment:** Track equipment assigned to users
4. **Certifications:** Professional certifications and training records
5. **Work Schedule:** Flexible work schedule management
6. **Cost Centers:** Financial tracking by cost center
7. **Specializations:** Construction specializations and skills
8. **Performance Metrics:** Performance tracking capabilities

