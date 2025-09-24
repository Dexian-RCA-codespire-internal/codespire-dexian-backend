/**
 * Text Enhancement Controller
 * Handles HTTP requests for text enhancement operations
 */

const { textEnhancementService } = require('../agents/text-enhancement');

class TextEnhancementController {
  /**
   * Enhance text based on input text and reference
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async enhanceText(req, res) {
    try {
      const { text, reference } = req.body;

      // Validate required fields
      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'text is required'
        });
      }

      // Validate input format
      if (typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid input format',
          message: 'text must be a string'
        });
      }

      if (text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Empty input',
          message: 'text must not be empty'
        });
      }

      console.log('🔍 Text Enhancement Request:', {
        textLength: text.length,
        hasReference: !!reference,
        enhancementType: 'clarity (default)',
        qualityLevel: 'standard (default)'
      });

      // Perform text enhancement
      const result = await textEnhancementService.enhanceText({
        text: text.trim(),
        reference: reference ? reference.trim() : undefined
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Text enhanced successfully',
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Text enhancement failed',
          message: result.error,
          details: result.details
        });
      }

    } catch (error) {
      console.error('❌ Error in text enhancement controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during text enhancement'
      });
    }
  }

  /**
   * Get available enhancement types and quality levels
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableOptions(req, res) {
    try {
      const result = textEnhancementService.getAvailableOptions();

      if (result.success) {
        res.json({
          success: true,
          message: 'Available options retrieved successfully',
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get available options',
          message: result.error
        });
      }

    } catch (error) {
      console.error('❌ Error getting available options:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve available options'
      });
    }
  }

  /**
   * Validate input for text enhancement
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateInput(req, res) {
    try {
      const { text, reference } = req.body;

      const result = textEnhancementService.validateInput({
        text,
        reference
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Input validation completed',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Input validation failed',
          message: result.error,
          details: result.details
        });
      }

    } catch (error) {
      console.error('❌ Error validating input:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Input validation failed'
      });
    }
  }
}

module.exports = new TextEnhancementController();
