/**
 * Timeline Context Service
 * Business logic layer for timeline context generation
 */

const timelineContextAgent = require('./timeline-context-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class TimelineContextService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Generate timeline description from input data
     */
    async generateTimelineDescription(inputData, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate input
            const validation = timelineContextAgent.validateInput(inputData);
            if (!validation.isValid) {
                return createErrorResponse(
                    'Validation failed',
                    validation.errors.join(', ')
                );
            }
            
            // Generate timeline description using the agent
            const result = await timelineContextAgent.generateTimelineDescription(inputData);
            
            if (!result.success) {
                return createErrorResponse(
                    'Failed to generate timeline description',
                    result.error || result.message
                );
            }
            
            const processingTime = Date.now() - startTime;
            
            // Create response using shared utility
            return createSuccessResponse({
                inputData: {
                    hasLogs: inputData.logs && inputData.logs.length > 0,
                    logCount: inputData.logs ? inputData.logs.length : 0,
                    problemStatementLength: inputData.problemStatement.length
                },
                timelineDescription: {
                    description: result.data.description,
                    context: result.data.context,
                    confidence: result.data.confidence
                },
                processingTimeMs: processingTime,
                metadata: {
                    wordCount: result.data.description.split(' ').length,
                    llmProvider: config.llm.provider,
                    temperature: config.llm.temperature,
                    generatedAt: result.data.generatedAt
                }
            }, 'Timeline description generated successfully');
            
        } catch (error) {
            console.error('❌ Error in generateTimelineDescription:', error);
            return createErrorResponse(
                'Failed to generate timeline description',
                error.message
            );
        }
    }

    /**
     * Check health status of the service
     */
    async checkHealth() {
        try {
            return await timelineContextAgent.healthCheck();
        } catch (error) {
            return createErrorResponse('Health check failed', error.message);
        }
    }

    /**
     * Get service capabilities and configuration
     */
    getCapabilities() {
        return timelineContextAgent.getCapabilities();
    }

    /**
     * Validate input data
     */
    validateInput(inputData) {
        return timelineContextAgent.validateInput(inputData);
    }

    /**
     * Get available configuration options
     */
    getAvailableOptions() {
        return createSuccessResponse({
            maxLogEntries: config.timeline.maxLogEntries,
            descriptionLength: config.timeline.descriptionLength,
            includeTechnicalDetails: config.timeline.includeTechnicalDetails,
            includeBusinessContext: config.timeline.includeBusinessContext,
            allowedLogLevels: config.validation.allowedLogLevels,
            supportedProviders: ['gemini', 'openai', 'anthropic', 'ollama']
        }, 'Available configuration options retrieved successfully');
    }
}

// Export singleton instance
module.exports = new TimelineContextService();
