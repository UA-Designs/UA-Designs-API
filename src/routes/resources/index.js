const express = require('express');
const router = express.Router();

// Import PMBOK Resource Management routes
const resourceManagementRoutes = require('./resourceManagement');

// Mount PMBOK Resource Management routes
router.use('/', resourceManagementRoutes);

// Resource Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Resource Management',
    knowledgeArea: 'Project Resource Management',
    processes: [
      'Plan Resource Management',
      'Estimate Activity Resources',
      'Acquire Resources',
      'Develop Team',
      'Manage Team',
      'Control Resources'
    ]
  });
});

module.exports = router;