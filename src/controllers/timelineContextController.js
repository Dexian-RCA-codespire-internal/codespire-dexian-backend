/**
 * Timeline Context Controller
 * API endpoints for timeline context generation
 */

const { service } = require('../agents/timeline-context');

class TimelineContextController {

    /**
     * Generate timeline description
     */
    async generateTimelineDescription(req, res) {
        try {
            const { problemStatement, ticketCreationTime, logs } = req.body;
            
            // Validate request
            const validation = service.validateInput({ problemStatement, ticketCreationTime, logs });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateTimelineDescription({ 
                problemStatement, 
                ticketCreationTime, 
                logs 
            });
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateTimelineDescription controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Get timeline context service health status
     */
    async getHealthStatus(req, res) {
        try {
            const result = await service.checkHealth();
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getHealthStatus controller:', error);
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                message: error.message
            });
        }
    }

    /**
     * Get service capabilities
     */
    async getCapabilities(req, res) {
        try {
            const result = service.getCapabilities();
            res.json({
                success: true,
                data: result,
                message: 'Service capabilities retrieved successfully'
            });
        } catch (error) {
            console.error('❌ Error in getCapabilities controller:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get service capabilities',
                message: error.message
            });
        }
    }

    /**
     * Get available configuration options
     */
    async getAvailableOptions(req, res) {
        try {
            const result = service.getAvailableOptions();
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getAvailableOptions controller:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get available options',
                message: error.message
            });
        }
    }
}

module.exports = new TimelineContextController();
