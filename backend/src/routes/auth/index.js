const express = require('express');
const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'UA Designs PMS Auth Service'
  });
});

// Login route
router.post('/login', (req, res) => {
  res.json({
    message: 'Login endpoint ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 