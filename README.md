# UA Designs Project Management System

A comprehensive PMBOK®-aligned Project Management System designed specifically for UA Designs, a mid-sized construction firm.

## Overview

This system addresses the critical gaps identified in UA Designs' current project management processes:

- **Scheduling**: Real-time updates and coordination
- **Resource Allocation**: Centralized tracking of materials, labor, and equipment
- **Cost Management**: Budget variance monitoring and expense tracking
- **Risk Mitigation**: Proactive risk assessment and mitigation strategies
- **Stakeholder Communication**: Integrated communication dashboard

## PMBOK Knowledge Areas Integration

The system is structured around PMBOK® knowledge areas:

1. **Project Integration Management** - Unified project dashboard
2. **Project Scope Management** - Change request process and scope control
3. **Project Schedule Management** - Gantt chart-based scheduling
4. **Project Cost Management** - Budget tracking and variance analysis
5. **Project Quality Management** - Quality control and assurance
6. **Project Resource Management** - Material, labor, and equipment allocation
7. **Project Communications Management** - Real-time messaging and reporting
8. **Project Risk Management** - Risk assessment and mitigation
9. **Project Procurement Management** - Material procurement tracking
10. **Project Stakeholder Management** - Stakeholder engagement and approval workflows

## Key Features

### Real-time Scheduling
- Gantt chart visualization
- Real-time progress updates
- Resource conflict detection
- Automated scheduling adjustments

### Cost Management
- Budget tracking and variance analysis
- Material cost monitoring
- Labor expense tracking
- Automated financial dashboards

### Resource Management
- Material usage tracking
- Labor assignment optimization
- Equipment allocation
- Real-time availability monitoring

### Risk Management
- Risk assessment module
- Mitigation strategy proposals
- Risk tracking and monitoring
- Early warning systems

### Communication Dashboard
- Real-time messaging (Pusher API integration)
- Progress reporting automation
- Approval tracking
- Stakeholder notifications

## Technology Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Real-time Communication**: Pusher API
- **Authentication**: JWT
- **File Storage**: AWS S3 (for documents and images)
- **Deployment**: Docker containers

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd ua_designs_pms

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Project Structure

```
ua_designs_pms/
├── frontend/                 # React frontend application
├── backend/                  # Node.js backend API
├── database/                 # Database migrations and seeds
├── docs/                     # Documentation
├── docker/                   # Docker configuration
└── shared/                   # Shared types and utilities
```

## Role-Based Access Control

The system implements role-based permissions aligned with UA Designs' operational structure:

- **Civil Engineer**: Materials, methodology, worker assignments
- **Architect**: Design and finishing materials
- **Site Engineer**: Progress tracking and site supervision
- **Junior/Apprentice Architects**: Detail development and supervision
- **Bookkeeper**: Payroll and finance
- **Secretary**: Liaison work and external transactions

## Getting Started

1. Review the project requirements and PMBOK alignment
2. Set up the development environment
3. Configure the database and API keys
4. Start with core modules (Scheduling, Cost Management)
5. Implement role-based access control
6. Add real-time communication features
7. Integrate risk management and reporting

## Contributing

This system is specifically designed for UA Designs' operational needs. All development should align with PMBOK® standards and construction industry best practices.

## License

Proprietary - UA Designs Project Management System 