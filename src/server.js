const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173', // Vite default port
    'http://localhost:3000', // React default port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// Rate limiting - Increased limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per window for development
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Speed limiting - Relaxed for development
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Increased from 50 to 500 requests per 15 minutes, then...
  delayMs: 100 // Reduced delay from 500ms to 100ms per request above limit
});
app.use('/api/', speedLimiter);

// Logging
app.use(morgan('combined'));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Core Project Management Knowledge Areas Routes
// 1. Project Schedule Management
app.use('/api/schedule', require('./routes/schedule'));

// 2. Project Cost Management
app.use('/api/cost', require('./routes/cost'));

// 3. Project Resource Management
app.use('/api/resources', require('./routes/resources'));

// 4. Project Risk Management
app.use('/api/risk', require('./routes/risk'));

// 5. Project Stakeholder Management
app.use('/api/stakeholders', require('./routes/stakeholders'));

// Authentication and User Management
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Project Management
app.use('/api/projects', require('./routes/projects'));

// Dashboard routes
app.use('/api/dashboard', require('./routes/dashboard'));

// Additional routes for project management

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    coreAreas: ['Schedule', 'Cost', 'Resources', 'Risk', 'Stakeholders']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested resource does not exist'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 UA Designs PMS Server running on port ${PORT}`);
  console.log(`📊 Core Project Management System`);
  console.log(`🎯 Focused on: Scheduling, Cost, Resources, Risk, Stakeholders`);
  console.log(`⏰ ${new Date().toISOString()}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app; 