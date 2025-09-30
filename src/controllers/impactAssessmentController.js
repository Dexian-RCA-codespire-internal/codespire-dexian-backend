/**
 * Impact Assessment Controller
 * Handles HTTP requests for impact assessment operations
 */

const { impactAssessmentService } = require('../agents/impact-assessment');

class ImpactAssessmentController {
  /**
   * Analyze impact based on problem statement and timeline context
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async analyzeImpact(req, res) {
    try {
      const { problemStatement, timelineContext } = req.body;

      // Validate required fields
      if (!problemStatement || !timelineContext) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Both problemStatement and timelineContext are required'
        });
      }

      // Validate input format
      if (typeof problemStatement !== 'string' || typeof timelineContext !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid input format',
          message: 'Both problemStatement and timelineContext must be strings'
        });
      }

      if (problemStatement.trim().length === 0 || timelineContext.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Empty input',
          message: 'Both problemStatement and timelineContext must not be empty'
        });
      }

      console.log('🔍 Impact Assessment Request:', {
        problemStatementLength: problemStatement.length,
        timelineContextLength: timelineContext.length
      });

      // Perform impact assessment
      const result = await impactAssessmentService.analyzeImpact({
        problemStatement: problemStatement.trim(),
        timelineContext: timelineContext.trim()
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Impact assessment completed successfully',
          data: {
            impactAssessments: result.data.impactAssessments
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Impact assessment failed',
          message: result.error,
          details: result.details
        });
      }

    } catch (error) {
      console.error('❌ Error in impact assessment controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during impact assessment'
      });
    }
  }

  /**
   * Get available impact levels and departments
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableOptions(req, res) {
    try {
      const result = impactAssessmentService.getAvailableOptions();

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
   * Validate input for impact assessment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateInput(req, res) {
    try {
      const { problemStatement, timelineContext } = req.body;

      const result = impactAssessmentService.validateInput({
        problemStatement,
        timelineContext
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

module.exports = new ImpactAssessmentController();
