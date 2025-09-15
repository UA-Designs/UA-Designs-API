const express = require('express');
const router = express.Router();

// Import PMBOK Cost Management routes
const costManagementRoutes = require('./costManagement');

// Mount PMBOK Cost Management routes
router.use('/', costManagementRoutes);

// Cost Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Cost Management',
    knowledgeArea: 'Project Cost Management',
    processes: [
      'Plan Cost Management',
      'Estimate Costs',
      'Determine Budget',
      'Control Costs'
    ]
  });
});

module.exports = router;