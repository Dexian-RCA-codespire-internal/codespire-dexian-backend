/**
 * Timeline Context Agent
 * Core agent for generating timeline descriptions and context from logs and problem statements
 */

const { providers, utils } = require('../shared');
const config = require('./config');

class TimelineContextAgent {
    constructor() {
        this.initialized = false;
        this.llm = null;
    }

    /**
     * Initialize the agent
     */
    async initialize() {
        try {
            if (this.initialized) {
                return { success: true, message: 'Agent already initialized' };
            }

            // Initialize LLM provider
            this.llm = providers.llm.createLLM(config.llm.provider);
            
            this.initialized = true;
            return { success: true, message: 'Timeline context agent initialized successfully' };
        } catch (error) {
            console.error('❌ Error initializing timeline context agent:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Generate timeline description from input data
     */
    async generateTimelineDescription(inputData) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const startTime = Date.now();
            
            // Validate input
            const validation = this.validateInput(inputData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                };
            }

            // Prepare context for LLM
            const context = this.prepareContext(inputData);
            
            // Generate description using LLM
            const result = await this.generateWithLLM(context);
            
            const processingTime = Date.now() - startTime;
            
            return {
                success: true,
                data: {
                    description: result.description,
                    context: result.context,
                    confidence: result.confidence,
                    processingTimeMs: processingTime,
                    generatedAt: new Date().toISOString()
                },
                metadata: {
                    inputData: {
                        hasLogs: inputData.logs && inputData.logs.length > 0,
                        logCount: inputData.logs ? inputData.logs.length : 0,
                        problemStatementLength: inputData.problemStatement.length
                    },
                    config: {
                        llmProvider: config.llm.provider,
                        temperature: config.llm.temperature,
                        includeTechnicalDetails: config.timeline.includeTechnicalDetails
                    }
                }
            };

        } catch (error) {
            console.error('❌ Error generating timeline description:', error);
            return {
                success: false,
                error: 'Failed to generate timeline description',
                message: error.message
            };
        }
    }

    /**
     * Validate input data
     */
    validateInput(inputData) {
        const errors = [];

        // Check required fields
        if (!inputData.problemStatement || typeof inputData.problemStatement !== 'string') {
            errors.push('problemStatement is required and must be a string');
        }

        if (!inputData.ticketCreationTime || typeof inputData.ticketCreationTime !== 'string') {
            errors.push('ticketCreationTime is required and must be a string');
        }

        // Validate problem statement length
        if (inputData.problemStatement && inputData.problemStatement.length > config.validation.maxProblemStatementLength) {
            errors.push(`problemStatement must not exceed ${config.validation.maxProblemStatementLength} characters`);
        }

        // Validate logs
        if (inputData.logs) {
            if (!Array.isArray(inputData.logs)) {
                errors.push('logs must be an array if provided');
            } else {
                if (inputData.logs.length > config.timeline.maxLogEntries) {
                    errors.push(`logs must not exceed ${config.timeline.maxLogEntries} entries`);
                }

                // Validate each log entry
                inputData.logs.forEach((log, index) => {
                    if (!log.time || !log.service || !log.level || !log.message) {
                        errors.push(`logs[${index}] must have time, service, level, and message properties`);
                    }

                    if (log.level && !config.validation.allowedLogLevels.includes(log.level)) {
                        errors.push(`logs[${index}].level must be one of: ${config.validation.allowedLogLevels.join(', ')}`);
                    }

                    if (log.message && log.message.length > config.validation.maxLogMessageLength) {
                        errors.push(`logs[${index}].message must not exceed ${config.validation.maxLogMessageLength} characters`);
                    }
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Prepare context for LLM generation
     */
    prepareContext(inputData) {
        const context = {
            problemStatement: inputData.problemStatement,
            ticketCreationTime: inputData.ticketCreationTime,
            logs: inputData.logs || [],
            descriptionRequirements: {
                minLength: config.timeline.descriptionLength.min,
                maxLength: config.timeline.descriptionLength.max
            },
            includeTechnicalDetails: config.timeline.includeTechnicalDetails,
            includeBusinessContext: config.timeline.includeBusinessContext
        };

        return context;
    }

    /**
     * Generate description using LLM
     */
    async generateWithLLM(context) {
        const prompt = this.buildPrompt(context);
        
        try {
            const response = await providers.llm.generateText(this.llm, prompt);

            return this.parseLLMResponse(response);
        } catch (error) {
            console.error('❌ Error in LLM generation:', error);
            
            // Fallback to default values if enabled
            if (config.errorHandling.fallbackToDefault) {
                return this.getDefaultResponse(context);
            }
            
            throw error;
        }
    }

    /**
     * Build prompt for LLM
     */
    buildPrompt(context) {
        const logsText = context.logs.length > 0 
            ? `\n\nLogs:\n${context.logs.map(log => 
                `[${log.time}] ${log.service} [${log.level}]: ${log.message}`
              ).join('\n')}`
            : '\n\nNo logs provided.';

        const technicalDetailsInstruction = context.includeTechnicalDetails 
            ? "Include relevant technical details and error analysis."
            : "Focus on high-level impact and user experience.";

        const businessContextInstruction = context.includeBusinessContext
            ? "Consider business impact and operational implications."
            : "Focus on technical timeline and sequence of events.";

        return `You are an expert IT timeline analyst. Generate a comprehensive timeline description based on the following information:

Problem Statement: ${context.problemStatement}
Ticket Creation Time: ${context.ticketCreationTime}${logsText}

Requirements:
1. Generate a timeline description (${context.descriptionRequirements.minLength}-${context.descriptionRequirements.maxLength} words) that explains the sequence of events and their significance
2. Provide context about how the logs relate to the problem statement
3. Explain the timeline progression and any patterns or correlations
4. ${technicalDetailsInstruction}
5. ${businessContextInstruction}

Respond in the following JSON format:
{
  "description": "Clear, concise timeline description explaining the sequence of events and their significance",
  "context": "Additional context about the timeline, patterns, and correlations",
  "confidence": 0.85
}

Focus on:
- Chronological sequence of events
- Relationship between logs and the problem statement
- Technical accuracy and meaningful analysis
- Clear explanation of timeline progression
- Identification of key events and their impact`;
    }

    /**
     * Parse LLM response
     */
    parseLLMResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate parsed response
            const validation = this.validateLLMResponse(parsed);
            if (!validation.isValid) {
                throw new Error(`Invalid LLM response: ${validation.errors.join(', ')}`);
            }

            return parsed;
        } catch (error) {
            console.error('❌ Error parsing LLM response:', error);
            throw new Error(`Failed to parse LLM response: ${error.message}`);
        }
    }

    /**
     * Validate LLM response
     */
    validateLLMResponse(response) {
        const errors = [];

        if (!response.description || typeof response.description !== 'string') {
            errors.push('description is required and must be a string');
        } else {
            const wordCount = response.description.split(' ').length;
            if (wordCount < config.timeline.descriptionLength.min || wordCount > config.timeline.descriptionLength.max) {
                errors.push(`description must be between ${config.timeline.descriptionLength.min} and ${config.timeline.descriptionLength.max} words (current: ${wordCount})`);
            }
        }

        if (!response.context || typeof response.context !== 'string') {
            errors.push('context is required and must be a string');
        }

        if (response.confidence !== undefined && (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1)) {
            errors.push('confidence must be a number between 0 and 1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get default response when LLM fails
     */
    getDefaultResponse(context) {
        const hasLogs = context.logs && context.logs.length > 0;
        const logCount = hasLogs ? context.logs.length : 0;
        
        return {
            description: `Timeline analysis for ${context.problemStatement.substring(0, 50)}... ${hasLogs ? `Based on ${logCount} log entries from ticket creation at ${context.ticketCreationTime}.` : 'No logs available for analysis.'}`,
            context: `Problem reported at ${context.ticketCreationTime}. ${hasLogs ? `Analysis of ${logCount} log entries shows system events and errors.` : 'Limited timeline data available for comprehensive analysis.'}`,
            confidence: 0.5
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const isLLMAvailable = this.llm && await this.llm.healthCheck();
            
            return {
                success: true,
                data: {
                    agent: 'Timeline Context Agent',
                    status: 'healthy',
                    initialized: this.initialized,
                    llmAvailable: isLLMAvailable,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Health check failed',
                message: error.message
            };
        }
    }

    /**
     * Get agent capabilities
     */
    getCapabilities() {
        return {
            agent: 'Timeline Context Agent',
            version: '1.0.0',
            capabilities: [
                'Generate timeline descriptions from logs and problem statements',
                'Analyze chronological sequence of events',
                'Identify patterns and correlations in logs',
                'Provide technical and business context',
                'Generate confidence scores for analysis'
            ],
            supportedInputs: [
                'problemStatement (required)',
                'ticketCreationTime (required)',
                'logs (optional array)'
            ],
            outputFormat: {
                description: 'string (20-150 words)',
                context: 'string',
                confidence: 'number (0-1)'
            }
        };
    }
}

module.exports = new TimelineContextAgent();
