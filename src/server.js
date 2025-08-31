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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Speed limiting
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50
});
app.use('/api/', speedLimiter);

// Logging
app.use(morgan('combined'));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PMBOK Knowledge Areas Routes (temporarily disabled for testing)
// 1. Project Integration Management
// app.use('/api/integration', require('./routes/integration'));

// 2. Project Scope Management
// app.use('/api/scope', require('./routes/scope'));

// 3. Project Schedule Management
app.use('/api/schedule', require('./routes/schedule'));

// 4. Project Cost Management
// app.use('/api/cost', require('./routes/cost'));

// 5. Project Quality Management
// app.use('/api/quality', require('./routes/quality'));

// 6. Project Resource Management
// app.use('/api/resources', require('./routes/resources'));

// 7. Project Communications Management
// app.use('/api/communications', require('./routes/communications'));

// 8. Project Risk Management
// app.use('/api/risk', require('./routes/risk'));

// 9. Project Procurement Management
// app.use('/api/procurement', require('./routes/procurement'));

// 10. Project Stakeholder Management
// app.use('/api/stakeholders', require('./routes/stakeholders'));

// Authentication and User Management
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// File uploads
// app.use('/api/uploads', require('./routes/uploads'));

// Reports and Analytics
// app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    pmbokAligned: true
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
  console.log(`📊 PMBOK-aligned Project Management System`);
  console.log(`🏗️  Construction Industry Optimized`);
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