/**
 * RCA Generation Controller
 * API endpoints for RCA generation operations
 */

const { service } = require('../agents/rca-generation');

const { webSocketService } = require('../services/websocketService');

class RCAGenerationController {
    constructor() {
        this.service = service;
    }

    /**
     * Generate complete RCA (both technical and customer-friendly)
     */
    async generateCompleteRCA(req, res) {
        try {
            const { ticketData, rcaFields } = req.body;
            
            // Validate request
            const validation = service.validateRCARequest({ ticketData, rcaFields });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateCompleteRCA(ticketData, rcaFields);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateCompleteRCA controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate technical RCA only
     */
    async generateTechnicalRCA(req, res) {
        try {
            const { ticketData, rcaFields } = req.body;
            
            // Validate request
            const validation = service.validateRCARequest({ ticketData, rcaFields });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            const result = await service.generateTechnicalRCA(ticketData, rcaFields);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateTechnicalRCA controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Generate customer-friendly summary only
     */
    async generateCustomerSummary(req, res) {
        try {
            const { technicalRCA, ticketData } = req.body;
            
            if (!technicalRCA || !ticketData) {
                return res.status(400).json({
                    success: false,
                    error: 'Technical RCA and ticket data are required'
                });
            }

            const result = await service.generateCustomerSummary(technicalRCA, ticketData);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
            
        } catch (error) {
            console.error('❌ Error in generateCustomerSummary controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Initialize streaming RCA generation
     */
    async generateStreamingRCA(req, res) {
        try {
            const { ticketData, rcaFields } = req.body;
            const socketId = req.headers['x-socket-id']; // Client should send their socket ID
            
            if (!socketId) {
                return res.status(400).json({
                    success: false,
                    error: 'Socket ID is required for streaming. Include x-socket-id header.'
                });
            }


            // Validate request
            const validation = service.validateRCARequest({ ticketData, rcaFields });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                });
            }

            // Start streaming generation (non-blocking)
            service.generateStreamingRCA(ticketData, rcaFields, socketId)
                .then(result => {
                    console.log('✅ Streaming RCA generation completed for socket:', socketId);
                })
                .catch(error => {
                    console.error('❌ Streaming RCA generation failed for socket:', socketId, error);
                });

            // Immediately respond that streaming has started
            res.json({
                success: true,
                message: 'RCA generation started. Listen for WebSocket events.',
                socketId,
                events: {
                    progress: 'rca_progress',
                    generation: 'rca_generation',
                    complete: 'rca_complete',
                    error: 'rca_error'
                }
            });
            
        } catch (error) {
            console.error('❌ Error in generateStreamingRCA controller:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Get RCA service health status
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
     * Get connected WebSocket clients count
     */
    async getWebSocketStatus(req, res) {
        try {
            const connectedClients = webSocketService.getConnectedClientsCount();
            
            res.json({
                success: true,
                data: {
                    connectedClients,
                    websocketEnabled: !!webSocketService.getServer(),
                    timestamp: new Date().toISOString()
                },
                message: 'WebSocket status retrieved successfully'
            });
            
        } catch (error) {
            console.error('❌ Error in getWebSocketStatus controller:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get WebSocket status',
                message: error.message
            });
        }
    }
}

module.exports = new RCAGenerationController();
