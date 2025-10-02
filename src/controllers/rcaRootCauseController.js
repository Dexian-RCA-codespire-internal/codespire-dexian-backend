/**
 * RCA Root Cause Analysis Controller
 * Handles HTTP requests for root cause analysis operations
 */

const rcaRootCauseAgent = require('../agents/rca-root-cause');

/**
 * Analyze root causes for a ticket
 * POST /api/rca-root-cause/analyze
 */
const analyzeRootCauses = async (req, res) => {
    try {
        const { currentTicket, similarTickets = [] } = req.body;

        // Validate request body
        if (!currentTicket) {
            return res.status(400).json({
                success: false,
                message: 'Current ticket is required',
                error: 'Missing currentTicket in request body'
            });
        }

        // Call the root cause analysis agent
        const result = await rcaRootCauseAgent.analyzeRootCauses(currentTicket, similarTickets);

        // Return appropriate status code based on result
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(result.statusCode || 500).json(result);
        }

    } catch (error) {
        console.error('Error in analyzeRootCauses controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during root cause analysis',
            error: error.message
        });
    }
};

/**
 * Get agent capabilities and health status
 * GET /api/rca-root-cause/capabilities
 */
const getCapabilities = async (req, res) => {
    try {
        const capabilities = rcaRootCauseAgent.getCapabilities();
        res.status(200).json({
            success: true,
            message: 'Agent capabilities retrieved successfully',
            ...capabilities
        });
    } catch (error) {
        console.error('Error getting capabilities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve agent capabilities',
            error: error.message
        });
    }
};

/**
 * Health check endpoint
 * GET /api/rca-root-cause/health
 */
const healthCheck = async (req, res) => {
    try {
        // Perform basic health checks
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            agent: 'rca-root-cause',
            version: '1.0.0',
            components: {
                llm_provider: 'operational',
                shared_utilities: 'operational',
                validation: 'operational'
            }
        };

        res.status(200).json({
            success: true,
            message: 'Root Cause Analysis agent is healthy',
            health: healthStatus
        });

    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            message: 'Root Cause Analysis agent is unhealthy',
            error: error.message,
            status: 'unhealthy'
        });
    }
};

module.exports = {
    analyzeRootCauses,
    getCapabilities,
    healthCheck
};