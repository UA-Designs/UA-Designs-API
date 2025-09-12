const express = require('express');
const router = express.Router();

// Import PMBOK Schedule Management routes
const scheduleManagementRoutes = require('./scheduleManagement');

// Mount PMBOK Schedule Management routes
router.use('/', scheduleManagementRoutes);

// Schedule Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Schedule Management',
    knowledgeArea: 'Project Schedule Management',
    processes: [
      'Plan Schedule Management',
      'Define Activities',
      'Sequence Activities',
      'Estimate Activity Durations',
      'Develop Schedule',
      'Control Schedule'
    ]
  });
});

module.exports = router;