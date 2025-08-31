# UA Designs PMS Development Guide

## Overview

This guide provides comprehensive instructions for setting up, developing, and deploying the UA Designs PMBOK-aligned Project Management System.

## Prerequisites

### Required Software
- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- Redis (v7 or higher)
- Docker & Docker Compose (for containerized deployment)
- Git

### Required Accounts
- Pusher account (for real-time communication)
- AWS account (for file storage)
- Email service (SMTP)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd ua_designs_pms

# Install dependencies
npm run install:all

# Copy environment files
cp backend/env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run database migrations
npm run migrate

# Seed initial data
npm run seed
```

### 3. Environment Configuration

Edit `backend/.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ua_designs_pms
DB_USER=postgres
DB_PASSWORD=ua_designs_password

# JWT
JWT_SECRET=your_secure_jwt_secret

# Pusher (Real-time communication)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=ap1

# AWS S3 (File storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=ua-designs-pms-files
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_PUSHER_APP_ID=your_pusher_app_id
REACT_APP_PUSHER_KEY=your_pusher_key
REACT_APP_PUSHER_CLUSTER=ap1
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend  # Backend on port 5000
npm run dev:frontend # Frontend on port 3000
```

## Project Structure

```
ua_designs_pms/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── models/         # PMBOK-aligned database models
│   │   ├── routes/         # API routes by PMBOK knowledge areas
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Authentication, validation
│   │   ├── services/       # External service integrations
│   │   └── utils/          # Helper functions
│   ├── database/           # Migrations and seeds
│   └── tests/              # API tests
├── frontend/               # React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   └── PMBOK/     # PMBOK knowledge area pages
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API service calls
│   │   ├── contexts/      # React contexts
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
│   └── public/            # Static assets
├── database/              # Database scripts
├── docs/                  # Documentation
└── docker/               # Docker configuration
```

## PMBOK Knowledge Areas Implementation

### 1. Project Integration Management
- **Location**: `backend/src/routes/integration.js`
- **Frontend**: `frontend/src/pages/PMBOK/Integration/`
- **Features**: Project charter, stakeholder identification, unified dashboard

### 2. Project Scope Management
- **Location**: `backend/src/routes/scope.js`
- **Frontend**: `frontend/src/pages/PMBOK/Scope/`
- **Features**: Work breakdown structure, scope control, change requests

### 3. Project Schedule Management
- **Location**: `backend/src/routes/schedule.js`
- **Frontend**: `frontend/src/pages/PMBOK/Schedule/`
- **Features**: Gantt charts, critical path analysis, resource scheduling

### 4. Project Cost Management
- **Location**: `backend/src/routes/cost.js`
- **Frontend**: `frontend/src/pages/PMBOK/Cost/`
- **Features**: Budget tracking, cost variance analysis, earned value management

### 5. Project Quality Management
- **Location**: `backend/src/routes/quality.js`
- **Frontend**: `frontend/src/pages/PMBOK/Quality/`
- **Features**: Quality control, inspections, quality metrics

### 6. Project Resource Management
- **Location**: `backend/src/routes/resources.js`
- **Frontend**: `frontend/src/pages/PMBOK/Resources/`
- **Features**: Material tracking, labor allocation, equipment management

### 7. Project Communications Management
- **Location**: `backend/src/routes/communications.js`
- **Frontend**: `frontend/src/pages/PMBOK/Communications/`
- **Features**: Real-time messaging, progress reporting, stakeholder notifications

### 8. Project Risk Management
- **Location**: `backend/src/routes/risk.js`
- **Frontend**: `frontend/src/pages/PMBOK/Risk/`
- **Features**: Risk assessment, mitigation strategies, risk matrix

### 9. Project Procurement Management
- **Location**: `backend/src/routes/procurement.js`
- **Frontend**: `frontend/src/pages/PMBOK/Procurement/`
- **Features**: Material procurement, vendor management, purchase orders

### 10. Project Stakeholder Management
- **Location**: `backend/src/routes/stakeholders.js`
- **Frontend**: `frontend/src/pages/PMBOK/Stakeholders/`
- **Features**: Stakeholder register, engagement planning, approval workflows

## UA Designs Role-Based Access Control

### Role Permissions

#### Civil Engineer (Mr. King Christian Uy)
- **Materials**: Read, Write, Approve
- **Methodology**: Read, Write, Approve
- **Worker Assignments**: Read, Write, Approve
- **Structural Materials**: Read, Write, Approve

#### Architect (Mrs. Mary Claire Anyayahan-Uy)
- **Design**: Read, Write, Approve
- **Finishing Materials**: Read, Write, Approve
- **Client Approval**: Read, Write, Approve
- **Design Review**: Read, Write, Approve

#### Site Engineer
- **Progress Tracking**: Read, Write, Approve
- **Site Supervision**: Read, Write, Approve
- **Quality Control**: Read, Write
- **Safety Management**: Read, Write, Approve

#### Junior/Apprentice Architects
- **Detail Development**: Read, Write
- **Supervision**: Read, Write
- **Design Support**: Read, Write

#### Bookkeeper
- **Payroll**: Read, Write, Approve
- **Finance**: Read, Write, Approve
- **Cost Tracking**: Read, Write, Approve
- **Budget Management**: Read, Write, Approve

#### Secretary
- **Liaison Work**: Read, Write
- **External Transactions**: Read, Write
- **Communication**: Read, Write
- **Document Management**: Read, Write

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/pmbok-schedule-management

# Make changes
# Test changes
npm run test

# Commit changes
git commit -m "feat: implement PMBOK schedule management"

# Push and create PR
git push origin feature/pmbok-schedule-management
```

### 2. Database Changes

```bash
# Create migration
cd backend
npx sequelize-cli migration:generate --name add-risk-matrix-table

# Run migration
npm run migrate

# Create seed data
npx sequelize-cli seed:generate --name seed-risk-categories
```

### 3. API Development

```bash
# Test API endpoints
npm run test:backend

# Check API documentation
# Visit: http://localhost:5000/api-docs
```

### 4. Frontend Development

```bash
# Start frontend development server
npm run dev:frontend

# Run tests
npm run test:frontend

# Build for production
npm run build:frontend
```

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual functions and methods
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows

### Frontend Testing
- **Component Tests**: React component functionality
- **Integration Tests**: Page interactions
- **E2E Tests**: User journey testing

### PMBOK Compliance Testing
- **Knowledge Area Coverage**: Ensure all PMBOK areas are implemented
- **Process Validation**: Verify PMBOK processes are followed
- **Construction Industry Alignment**: Validate construction-specific features

## Deployment

### Development Deployment

```bash
# Using Docker Compose
docker-compose up -d

# Or individual services
docker-compose up backend frontend postgres redis
```

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with PM2
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DB_HOST=production-db-host
DB_PASSWORD=secure-production-password
JWT_SECRET=very-secure-jwt-secret
PUSHER_APP_ID=production-pusher-id
AWS_ACCESS_KEY_ID=production-aws-key
```

## Monitoring and Logging

### Application Monitoring
- **PM2**: Process management and monitoring
- **Winston**: Structured logging
- **Pusher**: Real-time activity tracking

### Performance Monitoring
- **Database**: Query performance monitoring
- **API**: Response time tracking
- **Frontend**: User interaction analytics

## Security Considerations

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Session management with Redis

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### File Upload Security
- File type validation
- Size limits
- Virus scanning
- Secure storage with AWS S3

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down
docker volume rm ua_designs_pms_postgres_data
docker-compose up postgres -d
npm run migrate
npm run seed
```

#### API Issues
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Check environment variables
docker-compose exec backend env | grep DB_
```

#### Frontend Issues
```bash
# Clear cache
npm run build:frontend

# Check API connectivity
curl http://localhost:5000/api/health

# Restart frontend
docker-compose restart frontend
```

## Contributing

### Code Standards
- **Backend**: ESLint + Prettier
- **Frontend**: TypeScript + ESLint
- **Database**: Consistent naming conventions
- **API**: RESTful design principles

### PMBOK Compliance
- All features must align with PMBOK standards
- Construction industry best practices
- UA Designs operational requirements

### Documentation
- Update README.md for new features
- Document API changes
- Maintain PMBOK alignment documentation

## Support

For technical support or questions about PMBOK implementation:
- **Email**: support@uadesigns.com
- **Documentation**: `/docs` directory
- **API Documentation**: `http://localhost:5000/api-docs`

## License

This project is proprietary to UA Designs. All rights reserved. 