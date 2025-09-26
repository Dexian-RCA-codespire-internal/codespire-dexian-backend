/**
 * Impact Assessment Agent Module
 * Main entry point for impact assessment functionality
 */

const ImpactAssessmentService = require('./service');

// Create and export service instance
const impactAssessmentService = new ImpactAssessmentService();

module.exports = {
  impactAssessmentService,
  ImpactAssessmentService
};
