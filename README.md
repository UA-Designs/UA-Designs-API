# UA Designs API

Backend API for UA Designs PMBOK-aligned Project Management System - Construction Industry Optimized

## 🏗️ Overview

This is the backend API for a comprehensive project management system designed specifically for construction companies, following PMBOK (Project Management Body of Knowledge) standards. The system provides robust APIs for managing all aspects of construction projects from planning to completion.

## 🚀 Features

### PMBOK Knowledge Areas
- **Integration Management** - Project charter, change requests, project closure
- **Scope Management** - WBS, requirements, scope validation
- **Schedule Management** - Gantt charts, critical path, resource allocation
- **Cost Management** - Budget tracking, cost variance analysis, earned value
- **Quality Management** - Quality metrics, inspections, audits
- **Resource Management** - Team allocation, equipment tracking, skills matrix
- **Communications** - Stakeholder communication, meeting logs, reports
- **Risk Management** - Risk register, mitigation strategies, contingency planning
- **Procurement Management** - Vendor management, contracts, purchase orders

### Construction-Specific Features
- **Equipment Management** - Equipment tracking, maintenance schedules, utilization
- **Material Management** - Inventory tracking, procurement, waste management
- **Labor Management** - Time tracking, productivity metrics, safety compliance
- **Safety Management** - Incident reporting, safety inspections, compliance tracking
- **Progress Tracking** - Photo documentation, milestone tracking, progress reports

## 🛠️ Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (development) / PostgreSQL (production)
- **ORM:** Sequelize
- **Authentication:** JWT
- **File Upload:** Multer
- **Documentation:** PDF generation, Excel export
- **Real-time:** WebSocket support
- **Security:** Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/UA-Designs/UA-Designs-API.git
cd UA-Designs-API
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
```

#### Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ua_designs_pms
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DIALECT=postgresql
# For SQLite (development only)
# DB_STORAGE=./database.sqlite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@uadesigns.com

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx

# AWS Configuration (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=ua-designs-uploads

# Pusher Configuration (for real-time features)
PUSHER_APP_ID=your-pusher-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
PUSHER_CLUSTER=us2

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

# External APIs
WEATHER_API_KEY=your-weather-api-key
MAPS_API_KEY=your-google-maps-api-key

# Development Tools
DEBUG=ua-designs:*
NODEMON_IGNORE=node_modules,logs,uploads
```

**Important Security Notes:**
- Never commit your `.env` file to version control
- Use strong, unique secrets for JWT_SECRET and SESSION_SECRET
- Generate secure passwords for database access
- Use environment-specific values for production

### 4. Database Setup
```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

#### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Tasks & Scheduling
- `GET /api/schedule/tasks` - List tasks
- `POST /api/schedule/tasks` - Create task
- `PUT /api/schedule/tasks/:id` - Update task
- `GET /api/schedule/gantt` - Get Gantt chart data

#### Cost Management
- `GET /api/cost/budget` - Get budget information
- `POST /api/cost/expenses` - Record expense
- `GET /api/cost/variance` - Cost variance analysis

#### Risk Management
- `GET /api/risk/register` - Risk register
- `POST /api/risk/register` - Add new risk
- `PUT /api/risk/register/:id` - Update risk

#### Reports
- `GET /api/reports/project/:id` - Project report
- `GET /api/reports/cost/:id` - Cost report
- `GET /api/reports/schedule/:id` - Schedule report

## 🗂️ Project Structure

```
src/
├── config/           # Database and app configuration
├── database/         # Migration and seeding scripts
├── middleware/       # Authentication and other middleware
├── models/           # Sequelize models
│   ├── Project/      # Project-related models
│   ├── Task/         # Task and scheduling models
│   ├── User/         # User management models
│   ├── Cost/         # Cost management models
│   ├── Risk/         # Risk management models
│   └── ...           # Other PMBOK knowledge areas
├── routes/           # API route handlers
│   ├── auth/         # Authentication routes
│   ├── projects/     # Project management routes
│   ├── schedule/     # Scheduling routes
│   ├── cost/         # Cost management routes
│   ├── risk/         # Risk management routes
│   └── ...           # Other knowledge area routes
└── server.js         # Main server file
```

## 🔧 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention

## 📊 Database Schema

The system uses a comprehensive database schema supporting:
- User management and roles
- Project hierarchy and relationships
- Task dependencies and scheduling
- Cost tracking and budgeting
- Risk assessment and mitigation
- Resource allocation
- Quality management
- Communication logs

## 🚀 Deployment

### Production Environment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

### Docker Support
```bash
# Build image
docker build -t ua-designs-api .

# Run container
docker run -p 5000:5000 ua-designs-api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `docs/` folder

## 🔗 Related Projects

- **Frontend:** [UA-Designs-Frontend](https://github.com/UA-Designs/UA-Designs-Frontend) - React frontend application
- **Documentation:** See `docs/` folder for detailed guides

---

**Built with ❤️ for UA Designs Construction Management**