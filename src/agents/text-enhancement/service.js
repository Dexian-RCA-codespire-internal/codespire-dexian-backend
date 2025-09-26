/**
 * Text Enhancement Service
 * Service layer for text enhancement operations
 */

// Load environment variables
require('dotenv').config();

const TextEnhancementAgent = require('./text-enhancement-agent');
const config = require('./config');

class TextEnhancementService {
  constructor() {
    this.agent = new TextEnhancementAgent(config);
  }

  /**
   * Enhance text based on input text and reference
   * @param {Object} input - Input data
   * @returns {Object} - Text enhancement result
   */
  async enhanceText(input) {
    try {
      console.log('🔍 Starting text enhancement...');
      console.log('📝 Original text length:', input.text?.length || 0);
      console.log('📚 Reference provided:', !!input.reference);
      console.log('🎯 Enhancement type:', input.enhancementType || 'clarity');

      const result = await this.agent.enhanceText(input);

      if (result.success) {
        console.log('✅ Text enhancement completed successfully');
        console.log('📊 Total options generated:', result.data.totalOptions || 0);
        console.log('📈 Enhanced options:', result.data.enhancedOptions?.map((opt, idx) => 
          `Option ${opt.option}: ${opt.confidence}% confidence`
        ).join(', ') || 'N/A');
      } else {
        console.error('❌ Text enhancement failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in text enhancement service:', error);
      return {
        success: false,
        error: 'Text enhancement service error',
        details: error.message
      };
    }
  }

  /**
   * Get available enhancement types and quality levels
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
   * Validate input for text enhancement
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

module.exports = TextEnhancementService;
