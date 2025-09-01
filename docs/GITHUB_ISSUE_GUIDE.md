# GitHub Issue Creation Guide for UA Designs PMS

## 🎯 **How to Create Detailed Issues**

### **1. Basic Issue Creation Process**

1. **Navigate to Issues**
   - Go to your GitHub repository
   - Click the **"Issues"** tab
   - Click **"New issue"** (green button)

2. **Choose Template**
   - Select from available templates:
     - 🚀 Feature Request
     - 🐛 Bug Report  
     - 📚 PMBOK Module Implementation
   - Or start with a blank issue

3. **Fill Out Template**
   - Complete all relevant sections
   - Use checkboxes for tracking progress
   - Add labels and assignees

### **2. Issue Templates Available**

#### **🚀 Feature Request Template**
Use for new features, enhancements, or improvements.

**Key Sections:**
- Feature Description
- PMBOK Knowledge Area
- Construction-Specific Requirements
- Acceptance Criteria
- API Endpoints Needed
- Files to Create/Modify
- Security & Permissions
- Priority Level

#### **🐛 Bug Report Template**
Use for reporting bugs, errors, or unexpected behavior.

**Key Sections:**
- Bug Description
- Steps to Reproduce
- Expected vs Actual Behavior
- Environment Details
- Error Logs
- PMBOK Module Affected
- Security Impact
- Priority Level

#### **📚 PMBOK Module Template**
Use for implementing complete PMBOK knowledge area modules.

**Key Sections:**
- PMBOK Knowledge Area
- Construction-Specific Features
- API Endpoints to Implement
- Files to Create
- Database Schema
- Security & Permissions
- Testing Requirements
- Success Metrics

### **3. Detailed Issue Examples**

#### **Example 1: Cost Management Feature**

```markdown
## 🚀 Feature Request: Cost Management System

### 📋 Feature Description
Implement a comprehensive Cost Management system for tracking project budgets, expenses, and cost variance analysis with construction-specific cost categories.

### 🎯 PMBOK Knowledge Area
- [x] Cost Management

### 🏗️ Construction-Specific Requirements
- [x] Material cost tracking
- [x] Equipment rental costs
- [x] Labor cost management
- [x] Subcontractor costs
- [x] Permit and inspection fees

### ✅ Acceptance Criteria
- [ ] Create cost CRUD operations
- [ ] Implement budget vs actual cost tracking
- [ ] Add cost variance calculations (CV, SV, CPI, SPI)
- [ ] Create cost breakdown by category
- [ ] Generate cost reports (PDF/Excel)
- [ ] Add cost alerts for budget overruns
- [ ] Implement cost approval workflows

### 🔗 API Endpoints Needed
- [ ] `GET /api/costs` - List all costs
- [ ] `GET /api/costs/:id` - Get cost by ID
- [ ] `POST /api/costs` - Create new cost entry
- [ ] `PUT /api/costs/:id` - Update cost entry
- [ ] `DELETE /api/costs/:id` - Delete cost entry
- [ ] `GET /api/costs/project/:projectId` - Get costs by project
- [ ] `GET /api/costs/stats/overview` - Cost statistics
- [ ] `GET /api/costs/variance/:projectId` - Cost variance analysis
- [ ] `POST /api/costs/approve/:id` - Approve cost entry

### 📁 Files to Create/Modify
- [ ] `src/routes/cost/index.js` - Cost API routes
- [ ] `docs/COST_MANAGEMENT_API.md` - API documentation
- [ ] `src/models/Cost/index.js` - Cost model (if not exists)
- [ ] `src/middleware/costAuth.js` - Cost-specific permissions

### 🔒 Security & Permissions
- [x] Role-based access control
- [x] Data validation required
- [x] Authentication needed
- [x] Cost approval permissions
- [x] Budget modification restrictions

### 📊 Priority Level
- [x] 🟡 High (important for next release)

### 📝 Additional Notes
This feature is critical for project financial control and should integrate with existing Project Management and User Management systems.
```

#### **Example 2: Risk Management Bug**

```markdown
## 🐛 Bug Report: Risk Register Not Saving

### 🐛 Bug Description
Risk register entries are not being saved to the database when submitted through the API.

### 🔄 Steps to Reproduce
1. Login as Project Manager
2. Navigate to a project
3. Go to Risk Management section
4. Click "Add New Risk"
5. Fill out risk details
6. Click "Save Risk"
7. See error message

### ✅ Expected Behavior
Risk should be saved to database and appear in risk register.

### ❌ Actual Behavior
Error message: "Failed to save risk: Validation error"

### 📱 Environment
- **OS**: Windows 10
- **Browser**: Chrome 91
- **Node.js Version**: 18.17.0
- **Database**: SQLite

### 🔗 API Endpoint
- **Method**: POST
- **URL**: `/api/risks`
- **Request Body**: 
```json
{
  "name": "Weather Delays",
  "probability": 0.3,
  "impact": 0.7,
  "mitigation": "Schedule buffer time",
  "projectId": "uuid"
}
```

### 📋 Error Logs
```
ValidationError: Risk.probability cannot be null
    at Model.validate (/app/node_modules/sequelize/lib/model.js:1234:13)
    at Model.save (/app/node_modules/sequelize/lib/model.js:2345:7)
```

### 🎯 PMBOK Module Affected
- [x] Risk Management

### 🔒 Security Impact
- [x] No security impact

### 📊 Priority Level
- [x] 🟡 High (major functionality broken)
```

### **4. Issue Labels System**

#### **Priority Labels**
- `priority:critical` - System down, data loss
- `priority:high` - Major functionality broken
- `priority:medium` - Minor functionality affected
- `priority:low` - Cosmetic issues

#### **Type Labels**
- `type:bug` - Bug reports
- `type:enhancement` - Feature requests
- `type:documentation` - Documentation updates
- `type:refactor` - Code refactoring

#### **Component Labels**
- `component:backend` - Backend API changes
- `component:frontend` - Frontend changes
- `component:database` - Database changes
- `component:auth` - Authentication/authorization

#### **PMBOK Labels**
- `pmbok:integration` - Integration Management
- `pmbok:scope` - Scope Management
- `pmbok:schedule` - Schedule Management
- `pmbok:cost` - Cost Management
- `pmbok:quality` - Quality Management
- `pmbok:resource` - Resource Management
- `pmbok:communications` - Communications Management
- `pmbok:risk` - Risk Management
- `pmbok:procurement` - Procurement Management
- `pmbok:stakeholder` - Stakeholder Management

#### **Status Labels**
- `status:ready` - Ready for development
- `status:in-progress` - Currently being worked on
- `status:blocked` - Blocked by dependencies
- `status:review` - Ready for code review
- `status:testing` - In testing phase

### **5. Issue Assignment Strategy**

#### **Role-Based Assignment**
- **Admin**: All issues, system-wide changes
- **Project Manager**: PMBOK modules, project-related features
- **Civil Engineer**: Construction-specific features, quality management
- **Architect**: Design-related features, scope management
- **Site Engineer**: Field operations, resource management

#### **Skill-Based Assignment**
- **Backend Developer**: API development, database changes
- **Frontend Developer**: UI/UX, dashboard features
- **DevOps**: Deployment, infrastructure
- **QA Tester**: Testing, bug verification

### **6. Issue Workflow**

#### **Development Workflow**
1. **Create Issue** → Use appropriate template
2. **Assign Labels** → Priority, type, component, PMBOK
3. **Assign Developer** → Based on role and skills
4. **Move to "In Progress"** → When work starts
5. **Create Pull Request** → Link to issue
6. **Code Review** → Move to "Review" status
7. **Testing** → Move to "Testing" status
8. **Close Issue** → When feature is complete

#### **Project Board Integration**
- **Backlog** → New issues
- **To Do** → Ready for development
- **In Progress** → Currently being worked on
- **Review** → Code review phase
- **Testing** → Testing phase
- **Done** → Completed features

### **7. Issue Best Practices**

#### **Writing Good Issues**
1. **Clear Title** → Descriptive and specific
2. **Detailed Description** → What, why, how
3. **Acceptance Criteria** → Clear definition of done
4. **Context** → Background and motivation
5. **Examples** → Code snippets, screenshots
6. **Labels** → Proper categorization

#### **Issue Maintenance**
1. **Regular Updates** → Progress updates
2. **Status Changes** → Keep status current
3. **Assignee Updates** → Change when needed
4. **Label Updates** → Adjust as needed
5. **Close When Done** → Don't leave open

### **8. Issue Templates for Common Scenarios**

#### **API Endpoint Issue**
```markdown
## 🔗 API Endpoint: [Endpoint Name]

### 📋 Description
[Brief description of the endpoint]

### 🔗 Endpoint Details
- **Method**: [GET/POST/PUT/DELETE]
- **URL**: `/api/...`
- **Authentication**: [Required/Optional]
- **Authorization**: [Roles/Permissions needed]

### 📥 Request
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### 📤 Response
```json
{
  "success": true,
  "data": { ... }
}
```

### ✅ Acceptance Criteria
- [ ] Endpoint created
- [ ] Authentication working
- [ ] Authorization working
- [ ] Validation implemented
- [ ] Error handling
- [ ] Documentation updated
```

#### **Database Model Issue**
```markdown
## 🗄️ Database Model: [Model Name]

### 📋 Description
[Description of the database model]

### 🏗️ Schema
```sql
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY,
  field1 VARCHAR(255),
  field2 INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 🔗 Relationships
- [ ] One-to-One with [Model]
- [ ] One-to-Many with [Model]
- [ ] Many-to-Many with [Model]

### ✅ Acceptance Criteria
- [ ] Model created
- [ ] Migrations written
- [ ] Associations defined
- [ ] Validations added
- [ ] Tests written
```

This comprehensive guide will help your team create detailed, actionable issues that lead to successful feature implementations!

