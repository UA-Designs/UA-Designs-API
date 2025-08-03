#!/bin/bash

# UA Designs PMS Setup Script
# This script sets up the development environment for the PMBOK-aligned Project Management System

echo "🚀 Setting up UA Designs PMS Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and Docker Compose."
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p backend/uploads
mkdir -p backend/logs
mkdir -p frontend/public
mkdir -p database/init
mkdir -p docs

# Copy environment files
echo "📝 Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Backend environment file created"
else
    echo "⚠️  Backend environment file already exists"
fi

if [ ! -f frontend/.env ]; then
    echo "REACT_APP_API_URL=http://localhost:5000/api" > frontend/.env
    echo "REACT_APP_PUSHER_APP_ID=your_pusher_app_id" >> frontend/.env
    echo "REACT_APP_PUSHER_KEY=your_pusher_key" >> frontend/.env
    echo "REACT_APP_PUSHER_CLUSTER=ap1" >> frontend/.env
    echo "✅ Frontend environment file created"
else
    echo "⚠️  Frontend environment file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start database services
echo "🗄️  Starting database services..."
docker-compose up postgres redis -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
cd backend
npm run migrate
npm run seed
cd ..

# Create initial admin user
echo "👤 Creating initial admin user..."
cd backend
node -e "
const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@uadesigns.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true
    });
    console.log('✅ Admin user created successfully');
  } catch (error) {
    console.log('⚠️  Admin user may already exist');
  }
}

createAdminUser();
"
cd ..

# Create PM2 ecosystem file
echo "⚙️  Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'ua-designs-pms-backend',
      script: './backend/src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
EOF

# Create .gitignore
echo "📋 Creating .gitignore..."
cat > .gitignore << EOF
# Dependencies
node_modules/
*/node_modules/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Uploads
uploads/
*/uploads/

# Database
*.sqlite
*.db

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
.dockerignore

# PM2
.pm2/
EOF

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your configuration"
echo "2. Edit frontend/.env with your API keys"
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   Admin Login: admin@uadesigns.com / admin123"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Project overview"
echo "   - DEVELOPMENT_GUIDE.md - Detailed development guide"
echo "   - docs/ - Additional documentation"
echo ""
echo "🔧 Useful commands:"
echo "   npm run dev          - Start both frontend and backend"
echo "   npm run dev:backend  - Start backend only"
echo "   npm run dev:frontend - Start frontend only"
echo "   npm run test         - Run all tests"
echo "   docker-compose up    - Start all services"
echo "   docker-compose down  - Stop all services"
echo ""
echo "🏗️  UA Designs PMBOK-aligned Project Management System"
echo "   Ready for development!" 