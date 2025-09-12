const express = require('express');
const router = express.Router();

// Import PMBOK Stakeholder Management routes
const stakeholderManagementRoutes = require('./stakeholderManagement');

// Mount PMBOK Stakeholder Management routes
router.use('/', stakeholderManagementRoutes);

// Stakeholder Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Stakeholder Management',
    knowledgeArea: 'Project Stakeholder Management',
    processes: [
      'Identify Stakeholders',
      'Plan Stakeholder Engagement',
      'Manage Stakeholder Engagement',
      'Monitor Stakeholder Engagement'
    ]
  });
});

module.exports = router;