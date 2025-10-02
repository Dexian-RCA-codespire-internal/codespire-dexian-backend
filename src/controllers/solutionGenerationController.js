/**
 * Solution Generation Controller
 * Handles HTTP requests for solution generation operations
 */

const solutionGenerationAgent = require('../agents/solution-generation');

/**
 * Generate solutions for a ticket
 * POST /api/solution-generation/generate
 */
const generateSolutions = async (req, res) => {
    try {
        const { 
            currentTicket, 
            similarTickets = [], 
            rootCauses = [], 
            impactData = [] 
        } = req.body;

        // Validate request body
        if (!currentTicket) {
            return res.status(400).json({
                success: false,
                message: 'Current ticket is required',
                error: 'Missing currentTicket in request body'
            });
        }

        console.log('📋 Solution generation request received');
        console.log('📊 Request data:', {
            hasCurrentTicket: !!currentTicket,
            similarTicketsCount: similarTickets?.length || 0,
            rootCausesCount: rootCauses?.length || 0,
            impactDataCount: impactData?.length || 0
        });

        // Call the solution generation agent
        const result = await solutionGenerationAgent.generateSolutions(
            currentTicket,
            similarTickets,
            rootCauses,
            impactData
        );

        console.log('✅ Solution generation completed, success:', result?.success);

        // Return appropriate status code based on result
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(result.statusCode || 500).json(result);
        }

    } catch (error) {
        console.error('Error in generateSolutions controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during solution generation',
            error: error.message
        });
    }
};

/**
 * Generate solutions with streaming response
 * POST /api/solution-generation/generate-stream
 */
const generateSolutionsStream = async (req, res) => {
    try {
        const { 
            currentTicket, 
            similarTickets = [], 
            rootCauses = [], 
            impactData = [],
            socketId
        } = req.body;

        // Validate request body
        if (!currentTicket) {
            return res.status(400).json({
                success: false,
                message: 'Current ticket is required',
                error: 'Missing currentTicket in request body'
            });
        }

        if (!socketId) {
            return res.status(400).json({
                success: false,
                message: 'Socket ID is required for streaming',
                error: 'Missing socketId in request body'
            });
        }

        // Start solution generation (this will handle streaming internally)
        const result = await solutionGenerationAgent.generateSolutions(
            currentTicket,
            similarTickets,
            rootCauses,
            impactData,
            { streaming: true, socketId }
        );

        // Return immediate response indicating streaming has started
        res.status(202).json({
            success: true,
            message: 'Solution generation started, streaming results to WebSocket',
            socketId: socketId,
            estimatedTime: '2-5 minutes'
        });

    } catch (error) {
        console.error('Error in generateSolutionsStream controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during streaming solution generation',
            error: error.message
        });
    }
};

/**
 * Get agent capabilities and health status
 * GET /api/solution-generation/capabilities
 */
const getCapabilities = async (req, res) => {
    try {
        const capabilities = solutionGenerationAgent.getCapabilities();
        
        res.status(200).json({
            success: true,
            data: capabilities
        });

    } catch (error) {
        console.error('Error getting solution generation capabilities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get capabilities',
            error: error.message
        });
    }
};

/**
 * Health check endpoint
 * GET /api/solution-generation/health
 */
const healthCheck = async (req, res) => {
    try {
        const health = await solutionGenerationAgent.getHealth();
        
        // Set status code based on health
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 206 : 503;
        
        res.status(statusCode).json(health);

    } catch (error) {
        console.error('Error in solution generation health check:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            message: 'Health check failed',
            error: error.message
        });
    }
};

/**
 * Validate solution generation input
 * POST /api/solution-generation/validate
 */
const validateInput = async (req, res) => {
    try {
        const { currentTicket, similarTickets, rootCauses, impactData } = req.body;

        const validation = solutionGenerationAgent.validateSolutionInput({
            currentTicket,
            similarTickets,
            rootCauses,
            impactData
        });

        if (validation.isValid) {
            res.status(200).json({
                success: true,
                message: 'Input validation passed',
                valid: true
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Input validation failed',
                valid: false,
                errors: validation.errors
            });
        }

    } catch (error) {
        console.error('Error in input validation:', error);
        res.status(500).json({
            success: false,
            message: 'Internal error during validation',
            error: error.message
        });
    }
};

/**
 * Get solution templates or examples
 * GET /api/solution-generation/templates
 */
const getTemplates = async (req, res) => {
    try {
        const templates = {
            solutionStructure: {
                id: "number",
                title: "string",
                priority: "Critical|High|Medium|Low",
                category: "Immediate|Short-term|Long-term",
                timeframe: "string",
                confidence: "number (0-100)",
                description: "string",
                steps: "array of step objects",
                expectedOutcome: "string",
                rollbackPlan: "string",
                dependencies: "array of strings",
                riskLevel: "Low|Medium|High|Critical",
                businessImpact: "string"
            },
            stepStructure: {
                step: "number",
                title: "string",
                description: "string",
                responsible: "string",
                duration: "string",
                requirements: "array of strings",
                risks: "array of strings",
                validation: "string"
            },
            exampleSolution: {
                id: 1,
                title: "Network Buffer Optimization",
                priority: "Critical",
                category: "Immediate",
                timeframe: "2-4 hours",
                confidence: 90,
                description: "Optimize network switch buffers to resolve packet loss",
                steps: [
                    {
                        step: 1,
                        title: "Analyze Buffer Configuration",
                        description: "Review current buffer settings on affected switches",
                        responsible: "Network Engineer",
                        duration: "30 minutes",
                        requirements: ["Switch access", "Monitoring tools"],
                        risks: ["Read-only operation - minimal risk"],
                        validation: "Buffer utilization report generated"
                    }
                ],
                expectedOutcome: "Reduced packet loss by 95%",
                rollbackPlan: "Revert to previous configuration",
                dependencies: ["Network access", "Change approval"],
                riskLevel: "Medium",
                businessImpact: "Brief interruption during implementation"
            }
        };

        res.status(200).json({
            success: true,
            message: 'Solution templates retrieved successfully',
            templates: templates
        });

    } catch (error) {
        console.error('Error getting solution templates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get solution templates',
            error: error.message
        });
    }
};

module.exports = {
    generateSolutions,
    generateSolutionsStream,
    getCapabilities,
    healthCheck,
    validateInput,
    getTemplates
};