const forecastService = require('./forecastService');
const { forecastThresholds } = require('../../config/forecastThresholds');
const forecastMath = require('./forecastMath');

module.exports = {
  forecastService,
  forecastThresholds,
  forecastMath
};
