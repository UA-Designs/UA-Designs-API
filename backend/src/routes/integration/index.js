const express = require('express');
const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'UA Designs PMS Integration Service'
  });
});

// Project integration routes
router.get('/projects', (req, res) => {
  res.json({
    message: 'Project integration endpoint ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 