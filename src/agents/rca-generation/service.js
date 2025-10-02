/**
 * RCA Generation Service
 * Business logic layer for RCA generation operations
 */

const rcaAgent = require('./rca-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class RCAGenerationService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            await rcaAgent.initialize();
            this.initialized = true;
        } catch (error) {
            console.error('❌ Failed to initialize RCA Generation Service:', error);
            throw error;
        }
    }

    /**
     * Generate technical RCA only
     */
    async generateTechnicalRCA(ticketData, rcaFields, options = {}) {
        try {
            const startTime = Date.now();
            
            if (!this.initialized) {
                await this.initialize();
            }

            const result = await rcaAgent.generateTechnicalRCA(ticketData, rcaFields, options);
            const processingTime = Date.now() - startTime;
            
            if (result.success) {
                return createSuccessResponse({
                    technicalRCA: result.data.technicalRCA,
                    ticketData: result.data.ticketData,
                    rcaFields: result.data.rcaFields,
                    processing_time_ms: processingTime,
                    generatedAt: new Date().toISOString()
                }, 'Technical RCA generated successfully');
            } else {
                return createErrorResponse(
                    'Failed to generate technical RCA',
                    result.error
                );
            }
            
        } catch (error) {
            console.error('❌ Error in generateTechnicalRCA service:', error);
            return createErrorResponse(
                'Failed to generate technical RCA',
                error.message
            );
        }
    }

    /**
     * Generate customer-friendly summary only
     */
    async generateCustomerSummary(technicalRCA, ticketData, options = {}) {
        try {
            const startTime = Date.now();
            
            if (!this.initialized) {
                await this.initialize();
            }

            const result = await rcaAgent.generateCustomerFriendlySummary(technicalRCA, ticketData, options);
            const processingTime = Date.now() - startTime;
            
            if (result.success) {
                return createSuccessResponse({
                    customerSummary: result.data.customerSummary,
                    technicalRCA: result.data.technicalRCA,
                    ticketData: result.data.ticketData,
                    processing_time_ms: processingTime,
                    generatedAt: new Date().toISOString()
                }, 'Customer-friendly summary generated successfully');
            } else {
                return createErrorResponse(
                    'Failed to generate customer summary',
                    result.error
                );
            }
            
        } catch (error) {
            console.error('❌ Error in generateCustomerSummary service:', error);
            return createErrorResponse(
                'Failed to generate customer summary',
                error.message
            );
        }
    }

    /**
     * Generate complete RCA (both technical and customer-friendly)
     */
    async generateCompleteRCA(ticketData, rcaFields, options = {}) {
        try {
            const startTime = Date.now();
            
            if (!this.initialized) {
                await this.initialize();
            }

            const result = await rcaAgent.generateCompleteRCA(ticketData, rcaFields, options);
            const processingTime = Date.now() - startTime;
            
            if (result.success) {
                return createSuccessResponse({
                    technicalRCA: result.data.technicalRCA,
                    customerSummary: result.data.customerSummary,
                    ticketData: result.data.ticketData,
                    rcaFields: result.data.rcaFields,
                    processing_time_ms: processingTime,
                    generatedAt: result.data.generatedAt
                }, 'Complete RCA generated successfully');
            } else {
                return createErrorResponse(
                    'Failed to generate complete RCA',
                    result.error
                );
            }
            
        } catch (error) {
            console.error('❌ Error in generateCompleteRCA service:', error);
            return createErrorResponse(
                'Failed to generate complete RCA',
                error.message
            );
        }
    }

    /**
     * Generate RCA with streaming support
     */
    async generateStreamingRCA(ticketData, rcaFields, socketId, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Set streaming options
            const streamingOptions = {
                ...options,
                socketId,
                streaming: true
            };

            // Generate complete RCA with streaming
            return await this.generateCompleteRCA(ticketData, rcaFields, streamingOptions);
            
        } catch (error) {
            console.error('❌ Error in generateStreamingRCA service:', error);
            return createErrorResponse(
                'Failed to generate streaming RCA',
                error.message
            );
        }
    }

    /**
     * Validate RCA generation request
     */
    validateRCARequest(requestData) {
        const errors = [];
        
        if (!requestData) {
            errors.push('Request data is required');
            return { isValid: false, errors };
        }

        const { ticketData, rcaFields } = requestData;
        
        // Validate ticket data
        if (!ticketData) {
            errors.push('Ticket data is required');
        } else {
            if (!ticketData.ticket_id) {
                errors.push('Ticket ID is required');
            }
            if (!ticketData.short_description) {
                errors.push('Ticket short description is required');
            }
        }

        // Validate RCA fields
        if (!rcaFields) {
            errors.push('RCA fields are required');
        } else {
            const requiredFields = ['problem', 'timeline', 'impact', 'rootCause', 'correctiveActions'];
            
            for (const field of requiredFields) {
                if (!rcaFields[field]) {
                    errors.push(`RCA field '${field}' is required`);
                } else if (typeof rcaFields[field] !== 'string') {
                    errors.push(`RCA field '${field}' must be a string`);
                } else {
                    const limits = config.validation.textLimits[field];
                    if (limits) {
                        const length = rcaFields[field].length;
                        if (length < limits.min) {
                            errors.push(`RCA field '${field}' must be at least ${limits.min} characters`);
                        }
                        if (length > limits.max) {
                            errors.push(`RCA field '${field}' must not exceed ${limits.max} characters`);
                        }
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get service health status
     */
    async getHealthStatus() {
        try {
            const isInitialized = this.initialized;
            const agentInitialized = rcaAgent.initialized;
            
            return createSuccessResponse({
                service: 'RCA Generation Service',
                status: isInitialized && agentInitialized ? 'healthy' : 'unhealthy',
                initialized: isInitialized,
                agentInitialized: agentInitialized,
                timestamp: new Date().toISOString(),
                config: {
                    streamingEnabled: config.streaming.enabled,
                    maxTokens: config.llm.maxTokens,
                    model: config.llm.model
                }
            }, 'RCA Generation Service health check completed');
            
        } catch (error) {
            return createErrorResponse(
                'Health check failed',
                error.message
            );
        }
    }
}

// Export singleton instance
module.exports = new RCAGenerationService();
