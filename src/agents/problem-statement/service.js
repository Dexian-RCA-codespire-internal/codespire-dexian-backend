/**
 * Problem Statement Service
 * Business logic layer for problem statement generation
 */

const problemStatementAgent = require('./problem-statement-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class ProblemStatementService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Generate problem statement from input data
     */
    async generateProblemStatement(inputData, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate input
            const validation = problemStatementAgent.validateInput(inputData);
            if (!validation.isValid) {
                return createErrorResponse(
                    'Validation failed',
                    validation.errors.join(', ')
                );
            }
            
            // Check if skeleton loader is requested
            if (options.skeleton === true) {
                return this.generateSkeletonResponse(inputData);
            }
            
            // Generate problem statement using the agent
            const result = await problemStatementAgent.generateProblemStatement(inputData);
            
            if (!result.success) {
                return createErrorResponse(
                    'Failed to generate problem statement',
                    result.error || result.message
                );
            }
            
            const processingTime = Date.now() - startTime;
            
            // Create response using shared utility
            return createSuccessResponse({
                inputData: {
                    hasDescription: !!inputData.description,
                    hasServerLogs: inputData.serverLogs && inputData.serverLogs.length > 0,
                    logCount: inputData.serverLogs ? inputData.serverLogs.length : 0
                },
                problemStatement: {
                    problemDefinitions: result.data.problemDefinitions,
                    question: result.data.question,
                    issueType: result.data.issueType,
                    severity: result.data.severity,
                    businessImpact: result.data.businessImpact,
                    confidence: result.data.confidence
                },
                processingTimeMs: processingTime,
                metadata: {
                    wordCount: result.data.problemDefinitions[0].split(' ').length,
                    llmProvider: config.llm.provider,
                    temperature: config.problemStatement.temperature,
                    generatedAt: result.data.generatedAt
                }
            }, 'Problem statement generated successfully');
            
        } catch (error) {
            console.error('❌ Error in generateProblemStatement:', error);
            return createErrorResponse(
                'Failed to generate problem statement',
                error.message
            );
        }
    }

    /**
     * Generate skeleton response for loading states
     */
    generateSkeletonResponse(inputData) {
        const skeletonProblemStatement = {
            problemDefinitions: [
                "Analyzing issue details and server logs to generate comprehensive problem statement...",
                "Evaluating business impact and operational considerations...",
                "Assessing user experience and workflow implications..."
            ],
            question: "Generating insightful question to better understand this issue...",
            issueType: "Loading...",
            severity: "Loading...",
            businessImpact: "Loading...",
            confidence: 0.0,
            isSkeleton: true
        };

        return createSuccessResponse({
            inputData: {
                hasDescription: !!inputData.description,
                hasServerLogs: inputData.serverLogs && inputData.serverLogs.length > 0,
                logCount: inputData.serverLogs ? inputData.serverLogs.length : 0
            },
            problemStatement: skeletonProblemStatement,
            processingTimeMs: 0,
            isSkeleton: true,
            metadata: {
                wordCount: 0,
                llmProvider: config.llm.provider,
                temperature: config.problemStatement.temperature,
                skeleton_mode: true
            }
        }, 'Skeleton response generated for loading state');
    }

    /**
     * Check health status of the service
     */
    async checkHealth() {
        try {
            return await problemStatementAgent.healthCheck();
        } catch (error) {
            return createErrorResponse('Health check failed', error.message);
        }
    }

    /**
     * Get service capabilities and configuration
     */
    getCapabilities() {
        return problemStatementAgent.getCapabilities();
    }

    /**
     * Batch process multiple problem statement requests
     */
    async generateProblemStatementsBatch(inputDataArray) {
        const results = [];
        
        for (const inputData of inputDataArray) {
            try {
                const result = await this.generateProblemStatement(inputData);
                results.push({
                    inputData: {
                        hasDescription: !!inputData.description,
                        hasServerLogs: inputData.serverLogs && inputData.serverLogs.length > 0,
                        logCount: inputData.serverLogs ? inputData.serverLogs.length : 0
                    },
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    inputData: {
                        hasDescription: !!inputData.description,
                        hasServerLogs: inputData.serverLogs && inputData.serverLogs.length > 0,
                        logCount: inputData.serverLogs ? inputData.serverLogs.length : 0
                    },
                    success: false,
                    error: error.message
                });
            }
        }
        
        return createSuccessResponse({
            batchResults: results,
            totalProcessed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }, `Processed ${results.length} problem statement requests in batch`);
    }

    /**
     * Generate problem statement with custom parameters
     */
    async generateCustomProblemStatement(inputData, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate input
            const validation = problemStatementAgent.validateInput(inputData);
            if (!validation.isValid) {
                return createErrorResponse(
                    'Validation failed',
                    validation.errors.join(', ')
                );
            }
            
            // Apply custom options if provided
            const customConfig = {
                ...config,
                problemStatement: {
                    ...config.problemStatement,
                    ...options
                }
            };
            
            // Generate problem statement using the agent
            const result = await problemStatementAgent.generateProblemStatement(inputData);
            
            if (!result.success) {
                return createErrorResponse(
                    'Failed to generate problem statement',
                    result.error || result.message
                );
            }
            
            const processingTime = Date.now() - startTime;
            
            // Create response with custom metadata
            return createSuccessResponse({
                inputData: {
                    hasDescription: !!inputData.description,
                    hasServerLogs: inputData.serverLogs && inputData.serverLogs.length > 0,
                    logCount: inputData.serverLogs ? inputData.serverLogs.length : 0
                },
                problemStatement: {
                    problemDefinitions: result.data.problemDefinitions,
                    question: result.data.question,
                    issueType: result.data.issueType,
                    severity: result.data.severity,
                    businessImpact: result.data.businessImpact,
                    confidence: result.data.confidence
                },
                processingTimeMs: processingTime,
                metadata: {
                    wordCount: result.data.problemDefinitions[0].split(' ').length,
                    llmProvider: customConfig.llm.provider,
                    temperature: customConfig.problemStatement.temperature,
                    customOptions: options,
                    generatedAt: result.data.generatedAt
                }
            }, 'Problem statement generated with custom options');
            
        } catch (error) {
            console.error('❌ Error in generateCustomProblemStatement:', error);
            return createErrorResponse(
                'Failed to generate custom problem statement',
                error.message
            );
        }
    }

    /**
     * Validate input data
     */
    validateInput(inputData) {
        return problemStatementAgent.validateInput(inputData);
    }

    /**
     * Get available issue types, severity levels, and business impact categories
     */
    getAvailableOptions() {
        const { 
            ISSUE_TYPE_LIST, 
            SEVERITY_LEVEL_LIST, 
            BUSINESS_IMPACT_CATEGORY_LIST 
        } = require('../../constants/servicenow');

        return createSuccessResponse({
            issueTypes: ISSUE_TYPE_LIST,
            severityLevels: SEVERITY_LEVEL_LIST,
            businessImpactCategories: BUSINESS_IMPACT_CATEGORY_LIST,
            wordCountRequirements: {
                min: config.problemStatement.minWordCount,
                max: config.problemStatement.maxWordCount
            }
        }, 'Available options retrieved successfully');
    }
}

// Export singleton instance
module.exports = new ProblemStatementService();
