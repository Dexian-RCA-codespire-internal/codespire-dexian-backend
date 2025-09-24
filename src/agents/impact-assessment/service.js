/**
 * Impact Assessment Service
 * Service layer for impact assessment operations
 */

// Load environment variables
require('dotenv').config();

const ImpactAssessmentAgent = require('./impact-assessment-agent');
const config = require('./config');

class ImpactAssessmentService {
  constructor() {
    this.agent = new ImpactAssessmentAgent(config);
  }

  /**
   * Analyze impact based on problem statement and timeline context
   * @param {Object} input - Input data
   * @returns {Object} - Impact assessment result
   */
  async analyzeImpact(input) {
    try {
      console.log('🔍 Starting impact assessment analysis...');
      console.log('📋 Problem Statement:', input.problemStatement?.substring(0, 100) + '...');
      console.log('⏰ Timeline Context:', input.timelineContext?.substring(0, 100) + '...');

      const result = await this.agent.analyzeImpact(input);

      if (result.success) {
        console.log('✅ Impact assessment completed successfully');
        console.log('📊 Impact Level:', result.data.impactLevel);
        console.log('🏢 Department:', result.data.department);
        console.log('🎯 Confidence:', result.data.confidence + '%');
      } else {
        console.error('❌ Impact assessment failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in impact assessment service:', error);
      return {
        success: false,
        error: 'Impact assessment service error',
        details: error.message
      };
    }
  }

  /**
   * Get available impact levels and departments
   * @returns {Object} - Available options
   */
  getAvailableOptions() {
    try {
      return {
        success: true,
        data: this.agent.getAvailableOptions()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get available options',
        details: error.message
      };
    }
  }

  /**
   * Validate input for impact assessment
   * @param {Object} input - Input data to validate
   * @returns {Object} - Validation result
   */
  validateInput(input) {
    try {
      const validation = this.agent.validateInput(input);
      return {
        success: validation.isValid,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: 'Input validation failed',
        details: error.message
      };
    }
  }
}

module.exports = ImpactAssessmentService;
