const express = require('express');
const router = express.Router();

// Import PMBOK Risk Management routes
const riskManagementRoutes = require('./riskManagement');

// Mount PMBOK Risk Management routes
router.use('/', riskManagementRoutes);

// Risk Management health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PMBOK Risk Management',
    knowledgeArea: 'Project Risk Management',
    processes: [
      'Plan Risk Management',
      'Identify Risks',
      'Perform Qualitative Risk Analysis',
      'Perform Quantitative Risk Analysis',
      'Plan Risk Responses',
      'Implement Risk Responses',
      'Monitor Risks'
    ]
  });
});

module.exports = router;