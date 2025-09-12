const express = require('express');
const router = express.Router();

// Import PMBOK Communications Management routes
const communicationManagementRoutes = require('./communicationManagement');

// Mount PMBOK Communications Management routes
router.use('/', communicationManagementRoutes);

// Communications Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Communications Management',
    knowledgeArea: 'Project Communications Management',
    processes: [
      'Plan Communications Management',
      'Manage Communications',
      'Monitor Communications'
    ]
  });
});

module.exports = router;