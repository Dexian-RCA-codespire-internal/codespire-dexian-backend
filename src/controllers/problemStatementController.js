/**
 * Problem Statement Controller
 * API endpoints for problem statement generation
 */

const { service } = require('../agents/problem-statement');

class ProblemStatementController {

    /**
     * Generate problem statement
     */
    async generateProblemStatement(req, res) {
        try {
            const { shortDescription, description, serverLogs } = req.body;
            
            // Validate request
            const validation = service.validateInput({ shortDescription, description, serverLogs });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateProblemStatement({ shortDescription, description, serverLogs });
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateProblemStatement controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate problem statement with skeleton response
     */
    async generateProblemStatementSkeleton(req, res) {
        try {
            const { shortDescription, description, serverLogs } = req.body;
            
            // Validate request
            const validation = service.validateInput({ shortDescription, description, serverLogs });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateProblemStatement(
                { shortDescription, description, serverLogs }, 
                { skeleton: true }
            );
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateProblemStatementSkeleton controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate problem statement with custom options
     */
    async generateCustomProblemStatement(req, res) {
        try {
            const { shortDescription, description, serverLogs, options = {} } = req.body;
            
            // Validate request
            const validation = service.validateInput({ shortDescription, description, serverLogs });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateCustomProblemStatement(
                { shortDescription, description, serverLogs }, 
                options
            );
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateCustomProblemStatement controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate multiple problem statements in batch
     */
    async generateProblemStatementsBatch(req, res) {
        try {
            const { inputDataArray } = req.body;
            
            // Validate request
            if (!Array.isArray(inputDataArray)) {
                return res.status(400).json({
                    success: false,
                    error: 'inputDataArray must be an array'
                });
            }

            if (inputDataArray.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'inputDataArray cannot be empty'
                });
            }

            if (inputDataArray.length > 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum 10 problem statements can be processed in batch'
                });
            }

            // Validate each input data
            for (let i = 0; i < inputDataArray.length; i++) {
                const validation = service.validateInput(inputDataArray[i]);
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        error: `Validation failed for input data at index ${i}`,
                        details: validation.errors
                    });
                }
            }

            const result = await service.generateProblemStatementsBatch(inputDataArray);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateProblemStatementsBatch controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Get problem statement service health status
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
     * Get available options (issue types, severity levels, business impact categories)
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
}

module.exports = new ProblemStatementController();
