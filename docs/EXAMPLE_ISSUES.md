# Example GitHub Issues for UA Designs PMS

## 🚀 **Example Issue 1: Cost Management System**

```markdown
---
name: 🚀 Feature Request
about: Suggest a new feature for UA Designs PMS
title: '[FEATURE] Implement Cost Management System'
labels: ['enhancement', 'pmbok:cost', 'priority:high']
assignees: ''
---

## 📋 Feature Description
Implement a comprehensive Cost Management system for tracking project budgets, expenses, and cost variance analysis with construction-specific cost categories including materials, equipment, labor, and subcontractors.

## 🎯 PMBOK Knowledge Area
- [x] Cost Management

## 🏗️ Construction-Specific Requirements
- [x] Material cost tracking
- [x] Equipment rental costs
- [x] Labor cost management
- [x] Subcontractor costs
- [x] Permit and inspection fees
- [x] Safety equipment costs
- [x] Weather-related cost adjustments

## ✅ Acceptance Criteria
- [ ] Create cost CRUD operations
- [ ] Implement budget vs actual cost tracking
- [ ] Add cost variance calculations (CV, SV, CPI, SPI)
- [ ] Create cost breakdown by category
- [ ] Generate cost reports (PDF/Excel)
- [ ] Add cost alerts for budget overruns
- [ ] Implement cost approval workflows
- [ ] Add cost forecasting capabilities

## 🔗 API Endpoints Needed
- [ ] `GET /api/costs` - List all costs with filtering
- [ ] `GET /api/costs/:id` - Get cost by ID
- [ ] `POST /api/costs` - Create new cost entry
- [ ] `PUT /api/costs/:id` - Update cost entry
- [ ] `DELETE /api/costs/:id` - Delete cost entry
- [ ] `GET /api/costs/project/:projectId` - Get costs by project
- [ ] `GET /api/costs/stats/overview` - Cost statistics
- [ ] `GET /api/costs/variance/:projectId` - Cost variance analysis
- [ ] `POST /api/costs/approve/:id` - Approve cost entry
- [ ] `GET /api/costs/forecast/:projectId` - Cost forecasting

## 📁 Files to Create/Modify
- [ ] `src/routes/cost/index.js` - Cost API routes
- [ ] `docs/COST_MANAGEMENT_API.md` - API documentation
- [ ] `src/models/Cost/index.js` - Cost model
- [ ] `src/middleware/costAuth.js` - Cost-specific permissions

## 🎨 UI/UX Considerations
- [x] Dashboard cost widgets needed
- [x] Cost entry forms required
- [x] Cost variance charts needed
- [x] Budget vs actual visualizations

## 🔒 Security & Permissions
- [x] Role-based access control
- [x] Data validation required
- [x] Authentication needed
- [x] Cost approval permissions
- [x] Budget modification restrictions

## 📊 Priority Level
- [x] 🟡 High (important for next release)

## 📝 Additional Notes
This feature is critical for project financial control and should integrate with existing Project Management and User Management systems. Should support construction-specific cost categories and approval workflows.
```

## 🐛 **Example Issue 2: Project Creation Bug**

```markdown
---
name: 🐛 Bug Report
about: Report a bug in UA Designs PMS
title: '[BUG] Project creation fails with validation error'
labels: ['bug', 'pmbok:integration', 'priority:high']
assignees: ''
---

## 🐛 Bug Description
Project creation fails with a validation error when trying to create a new project through the API, even when all required fields are provided.

## 🔄 Steps to Reproduce
1. Login as Project Manager
2. Make POST request to `/api/projects`
3. Include all required fields in request body
4. Submit the request
5. See validation error

## ✅ Expected Behavior
Project should be created successfully and return project data with generated project number.

## ❌ Actual Behavior
Returns 400 error: "Missing required fields: projectLocation"

## 📱 Environment
- **OS**: Windows 10
- **Browser**: Postman/Thunder Client
- **Node.js Version**: 18.17.0
- **Database**: SQLite

## 🔗 API Endpoint
- **Method**: POST
- **URL**: `/api/projects`
- **Request Body**: 
```json
{
  "name": "Test Project",
  "description": "Test project description",
  "projectType": "RESIDENTIAL",
  "clientName": "Test Client",
  "projectLocation": {
    "address": "123 Test Street",
    "city": "Test City"
  },
  "startDate": "2024-01-15",
  "plannedEndDate": "2024-08-30",
  "budget": 1000000
}
```

## 📋 Error Logs
```
ValidationError: Missing required fields: projectLocation
    at router.post (/app/src/routes/projects/index.js:145:15)
```

## 🎯 PMBOK Module Affected
- [x] Integration Management
- [x] Project Management

## 🔒 Security Impact
- [x] No security impact

## 📊 Priority Level
- [x] 🟡 High (major functionality broken)

## 📝 Additional Notes
This is blocking project creation functionality. The validation logic seems to be incorrectly checking for projectLocation field.
```

## 📚 **Example Issue 3: Risk Management Module**

```markdown
---
name: 📚 PMBOK Module Implementation
about: Implement a complete PMBOK knowledge area module
title: '[PMBOK] Implement Risk Management Module'
labels: ['pmbok:risk', 'enhancement', 'backend', 'priority:medium']
assignees: ''
---

## 📚 PMBOK Knowledge Area
- [x] Risk Management

## 🎯 Module Overview
Implement a comprehensive Risk Management system for identifying, assessing, and mitigating project risks with construction-specific risk categories and automated risk scoring.

## 🏗️ Construction-Specific Features
- [x] Weather-related risks
- [x] Safety risks
- [x] Material availability risks
- [x] Equipment failure risks
- [x] Labor shortage risks
- [x] Permit delays
- [x] Site condition risks
- [x] Quality risks
- [x] Cost overrun risks
- [x] Schedule delays

## 🔗 API Endpoints to Implement

### Core CRUD Operations
- [x] `GET /api/risks` - List all risks with filtering
- [x] `GET /api/risks/:id` - Get risk by ID
- [x] `POST /api/risks` - Create new risk
- [x] `PUT /api/risks/:id` - Update risk
- [x] `DELETE /api/risks/:id` - Delete risk

### Specialized Endpoints
- [x] `GET /api/risks/stats/overview` - Risk statistics
- [x] `GET /api/risks/project/:projectId` - Get risks by project
- [x] `PATCH /api/risks/:id/status` - Update risk status
- [x] `GET /api/risks/search` - Search risks
- [x] `POST /api/risks/:id/mitigate` - Add mitigation strategy
- [x] `GET /api/risks/analysis/:projectId` - Risk analysis report

## 📁 Files to Create
- [x] `src/routes/risk/index.js` - Risk API routes
- [x] `docs/RISK_MANAGEMENT_API.md` - API documentation
- [x] `src/models/Risk/index.js` - Risk model
- [x] `src/middleware/riskAuth.js` - Risk-specific permissions

## 🗄️ Database Schema
- [x] Primary table: `risks`
- [x] Relationships with projects table
- [x] Relationships with users table
- [x] Risk categories table
- [x] Mitigation strategies table

## 🔒 Security & Permissions
- [x] Role-based access control
- [x] Permission-based authorization
- [x] Data validation
- [x] Input sanitization
- [x] Risk visibility controls

## 🧪 Testing Requirements
- [x] Unit tests for API endpoints
- [x] Integration tests
- [x] Database tests
- [x] Authentication tests
- [x] Permission tests

## 📊 Success Metrics
- [x] All API endpoints working
- [x] Database operations successful
- [x] Authentication/authorization working
- [x] Documentation complete
- [x] Tests passing

## 🎨 Frontend Integration
- [x] Risk register dashboard
- [x] Risk assessment forms
- [x] Risk matrix visualization
- [x] Risk trend charts

## 📋 Dependencies
- [x] User Management (completed)
- [x] Project Management (completed)
- [x] Database setup (completed)
- [x] Authentication system (completed)

## 📝 Additional Notes
This module should include risk scoring algorithms, automated risk alerts, and integration with project scheduling for risk impact analysis.
```

## 🔧 **Example Issue 4: API Documentation Update**

```markdown
---
name: 📚 PMBOK Module Implementation
about: Implement a complete PMBOK knowledge area module
title: '[DOCS] Update API Documentation for Project Management'
labels: ['documentation', 'pmbok:integration', 'priority:low']
assignees: ''
---

## 📚 PMBOK Knowledge Area
- [x] Integration Management

## 🎯 Module Overview
Update and improve the API documentation for the Project Management system to include more detailed examples, error responses, and usage scenarios.

## 🏗️ Construction-Specific Features
- [x] Construction project examples
- [x] Building permit workflows
- [x] Site condition documentation
- [x] Safety requirement examples

## 🔗 API Endpoints to Document
- [x] All existing project endpoints
- [x] Error response examples
- [x] Authentication examples
- [x] Permission examples
- [x] Construction-specific use cases

## 📁 Files to Create/Modify
- [x] `docs/PROJECT_MANAGEMENT_API.md` - Update existing documentation
- [x] `docs/API_EXAMPLES.md` - Add detailed examples
- [x] `docs/ERROR_CODES.md` - Document error responses

## 🗄️ Database Schema
- [x] Update schema documentation
- [x] Add relationship diagrams
- [x] Document field constraints

## 🔒 Security & Permissions
- [x] Document authentication flow
- [x] Document authorization rules
- [x] Document permission requirements

## 🧪 Testing Requirements
- [x] Add Postman collection
- [x] Add curl examples
- [x] Add JavaScript examples

## 📊 Success Metrics
- [x] All endpoints documented
- [x] Examples provided
- [x] Error responses documented
- [x] Authentication flow documented

## 🎨 Frontend Integration
- [x] Frontend integration examples
- [x] React/JavaScript examples
- [x] Error handling examples

## 📋 Dependencies
- [x] Project Management API (completed)

## 📝 Additional Notes
This documentation update will help developers integrate with the Project Management API more effectively.
```

## 🎯 **How to Use These Examples**

1. **Copy the template** that matches your needs
2. **Customize the content** for your specific feature/bug
3. **Update the labels** to match your project's labeling system
4. **Assign to appropriate team member**
5. **Add to project board** for tracking

## 📋 **Issue Creation Checklist**

Before creating an issue, ensure you have:

- [ ] **Clear title** that describes the issue
- [ ] **Detailed description** of what needs to be done
- [ ] **Acceptance criteria** that define "done"
- [ ] **Proper labels** for categorization
- [ ] **Assignee** if known
- [ ] **Priority level** set appropriately
- [ ] **Dependencies** identified
- [ ] **Files to create/modify** listed
- [ ] **API endpoints** specified (if applicable)
- [ ] **Security considerations** noted

This systematic approach will help your team create high-quality, actionable issues that lead to successful implementations!

