/**
 * Auto-Suggestion Controller
 * API endpoints for auto-suggestion operations
 */

const { service } = require('../agents/auto-suggestion');

class AutoSuggestionController {

    /**
     * Generate text suggestion
     */
    async generateSuggestion(req, res) {
        try {
            const { currentText, reference = '' } = req.body;
            
            // Validate request
            const validation = service.validateSuggestionRequest({ currentText, reference });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateSuggestion(currentText, reference);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateSuggestion controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate suggestions with automatic count determination
     */
    async generateAutoSuggestions(req, res) {
        try {
            const { currentText, reference = '' } = req.body;
            
            // Validate request
            const validation = service.validateSuggestionRequest({ currentText, reference });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateAutoSuggestions(currentText, reference);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateAutoSuggestions controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate multiple alternative suggestions
     */
    async generateMultipleSuggestions(req, res) {
        try {
            const { currentText, reference = '', count = null } = req.body;
            
            // Validate request
            const validation = service.validateSuggestionRequest({ currentText, reference });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            // Validate count (only if provided)
            if (count !== null && count !== undefined && (typeof count !== 'number' || count < 1 || count > 10)) {
                return res.status(400).json({
                    success: false,
                    error: 'Count must be a number between 1 and 10, or omit for dynamic count'
                });
            }

            const result = await service.generateMultipleSuggestions(currentText, reference, count);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateMultipleSuggestions controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Get auto-suggestion service health status
     */
    async getHealthStatus(req, res) {
        try {
            const result = await service.getHealthStatus();
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
     * Clear suggestion cache
     */
    async clearCache(req, res) {
        try {
            const result = await service.clearCache();
            res.json(result);
        } catch (error) {
            console.error('❌ Error in clearCache controller:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache',
                message: error.message
            });
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(req, res) {
        try {
            const result = await service.getCacheStats();
            res.json(result);
        } catch (error) {
            console.error('❌ Error in getCacheStats controller:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cache statistics',
                message: error.message
            });
        }
    }
}

module.exports = new AutoSuggestionController();
