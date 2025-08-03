const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Schedule Management' });
});

module.exports = router; 