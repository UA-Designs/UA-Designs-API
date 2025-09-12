const express = require('express');
const router = express.Router();

// Import PMBOK Procurement Management routes
const procurementManagementRoutes = require('./procurementManagement');

// Mount PMBOK Procurement Management routes
router.use('/', procurementManagementRoutes);

// Procurement Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Procurement Management',
    knowledgeArea: 'Project Procurement Management',
    processes: [
      'Plan Procurement Management',
      'Conduct Procurements',
      'Control Procurements'
    ]
  });
});

module.exports = router;