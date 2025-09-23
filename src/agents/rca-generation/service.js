/**
 * RCA Generation Service
 * Business logic layer for RCA generation operations
 */

const rcaAgent = require('./rca-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');
const RCAResolved = require('../../models/RCAResolved');

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
                // Store RCA results in database
                const storeResult = await this.storeRCAResults(
                    ticketData, 
                    rcaFields, 
                    result.data.technicalRCA, 
                    result.data.customerSummary
                );
                
                return createSuccessResponse({
                    technicalRCA: result.data.technicalRCA,
                    customerSummary: result.data.customerSummary,
                    ticketData: result.data.ticketData,
                    rcaFields: result.data.rcaFields,
                    processing_time_ms: processingTime,
                    generatedAt: result.data.generatedAt,
                    database: storeResult.success ? {
                        rcaId: storeResult.data.rcaId,
                        ticketNumber: storeResult.data.ticketNumber,
                        stored: true
                    } : {
                        stored: false,
                        error: storeResult.error
                    }
                }, 'Complete RCA generated and stored successfully');
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
     * Store RCA results in database
     */
    async storeRCAResults(ticketData, rcaFields, technicalRCA, customerSummary) {
        try {
            // Create RCA resolved record
            const rcaRecord = new RCAResolved({
                ticket_number: ticketData.ticket_id || ticketData.ticket_number || 'RCA-' + Date.now(),
                source: 'RCA_Generation',
                short_description: ticketData.short_description || 'Generated RCA',
                description: ticketData.description || '',
                category: ticketData.category || 'General',
                priority: ticketData.priority || 'Medium',
                impact: rcaFields.impact || '',
                urgency: ticketData.urgency || 'Medium',
                sys_id: ticketData.sys_id || 'RCA-' + Date.now(),
                root_cause: rcaFields.rootCause || '',
                close_code: 'Solved (Permanently)',
                customer_summary: customerSummary,
                problem_statement: rcaFields.problem || '',
                resolution_analysis: technicalRCA,
                resolved_by: 'AI_System',
                resolved_at: new Date(),
                resolution_method: 'ai_assisted',
                servicenow_updated: false,
                servicenow_update_attempts: 0,
                last_servicenow_update_attempt: null,
                servicenow_update_error: null,
                created_at: new Date(),
                updated_at: new Date()
            });

            const savedRecord = await rcaRecord.save();
            
            return createSuccessResponse({
                rcaId: savedRecord._id,
                ticketNumber: savedRecord.ticket_number,
                message: 'RCA results stored successfully'
            }, 'RCA results saved to database');

        } catch (error) {
            console.error('❌ Error storing RCA results:', error);
            return createErrorResponse(
                'Failed to store RCA results',
                error.message
            );
        }
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
