const express = require('express');
const router = express.Router();

// Import PMBOK Quality Management routes
const qualityManagementRoutes = require('./qualityManagement');

// Mount PMBOK Quality Management routes
router.use('/', qualityManagementRoutes);

// Quality Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Quality Management',
    knowledgeArea: 'Project Quality Management',
    processes: [
      'Plan Quality Management',
      'Manage Quality',
      'Control Quality'
    ]
  });
});

module.exports = router;