/**
 * RCA Generation Agent
 * Handles technical RCA generation and customer-friendly summary creation
 */

const { providers, utils } = require('../shared');
const llmProvider = providers.llm;
const config = require('./config');
const { webSocketService } = require('../../services/websocketService');
const WebSocketUtils = require('../../services/websocketUtils');

class RCAGenerationAgent {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the RCA generation agent
     */
    async initialize() {
        try {
            console.log('🚀 Initializing RCA Generation Agent...');
            
            // Create LLM instance for technical RCA
            this.technicalLLM = llmProvider.createLLM('gemini', {
                model: config.llm.model,
                temperature: config.llm.temperature,
                maxOutputTokens: config.llm.maxTokens
            });
            
            this.initialized = true;
            console.log('✅ RCA Generation Agent initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize RCA Generation Agent:', error);
            throw error;
        }
    }

    /**
     * Generate technical RCA based on ticket data and RCA fields
     */
    async generateTechnicalRCA(ticketData, rcaFields, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const { socketId, streaming = false } = options;

            // Validate inputs
            const validation = this.validateRCAInput(ticketData, rcaFields);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Create technical RCA prompt
            const prompt = this.createTechnicalRCAPrompt(ticketData, rcaFields);
            
            if (streaming && socketId) {
                return await this.generateStreamingRCA(prompt, socketId, 'technical');
            } else {
                // Generate technical RCA
                const technicalRCA = await llmProvider.generateText(this.technicalLLM, prompt);
                
                return {
                    success: true,
                    data: {
                        technicalRCA: technicalRCA.trim(),
                        ticketData,
                        rcaFields
                    }
                };
            }

        } catch (error) {
            console.error('❌ Error in generateTechnicalRCA:', error);
            
            if (options.socketId) {
                webSocketService.getServer()?.to(options.socketId).emit(config.websocket.events.rcaError, {
                    error: error.message,
                    type: 'technical_rca',
                    timestamp: new Date().toISOString()
                });
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate customer-friendly summary using existing ticket-resolution agent
     */
    async generateCustomerFriendlySummary(technicalRCA, ticketData, options = {}) {
        try {
            const { socketId, streaming = false } = options;
            
            // Import ticket resolution agent for customer-friendly summary
            const { resolutionAgent } = require('../ticket-resolution');
            
            if (!resolutionAgent.initialized) {
                await resolutionAgent.initialize();
            }

            // Create customer-friendly prompt using technical RCA as root cause
            const customerPrompt = this.createCustomerFriendlyPrompt(technicalRCA, ticketData);
            
            if (streaming && socketId) {
                return await this.generateStreamingSummary(customerPrompt, socketId, 'customer');
            } else {
                // Generate customer-friendly summary
                const customerSummary = await llmProvider.generateText(resolutionAgent.llm, customerPrompt);
                
                return {
                    success: true,
                    data: {
                        customerSummary: customerSummary.trim(),
                        technicalRCA,
                        ticketData
                    }
                };
            }

        } catch (error) {
            console.error('❌ Error in generateCustomerFriendlySummary:', error);
            
            if (options.socketId) {
                webSocketService.getServer()?.to(options.socketId).emit(config.websocket.events.rcaError, {
                    error: error.message,
                    type: 'customer_summary',
                    timestamp: new Date().toISOString()
                });
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate complete RCA (both technical and customer-friendly)
     */
    async generateCompleteRCA(ticketData, rcaFields, options = {}) {
        try {
            const { socketId, streaming = false } = options;
            let technicalRCA, customerSummary;

            // Create streaming session
            let streamingHandler = null;
            if (socketId) {
                streamingHandler = await WebSocketUtils.createStreamingSession(socketId, {
                    room: config.websocket.rooms.rcaGeneration,
                    events: {
                        progressEvent: config.websocket.events.rcaProgress,
                        contentEvent: config.websocket.events.rcaGeneration,
                        completeEvent: config.websocket.events.rcaComplete,
                        errorEvent: config.websocket.events.rcaError
                    }
                });

                streamingHandler.emitProgress({
                    stage: 'starting',
                    message: 'Starting RCA generation...'
                });
            }

            // Step 1: Generate technical RCA
            if (streamingHandler) {
                streamingHandler.emitProgress({
                    stage: 'technical_rca',
                    message: 'Generating technical RCA...'
                });
            }

            const technicalResult = await this.generateTechnicalRCA(ticketData, rcaFields, { 
                socketId, 
                streaming 
            });
            
            if (!technicalResult.success) {
                throw new Error(`Technical RCA generation failed: ${technicalResult.error}`);
            }

            technicalRCA = technicalResult.data.technicalRCA;

            // Step 2: Generate customer-friendly summary
            if (streamingHandler) {
                streamingHandler.emitProgress({
                    stage: 'customer_summary',
                    message: 'Generating customer-friendly summary...'
                });
            }

            const customerResult = await this.generateCustomerFriendlySummary(technicalRCA, ticketData, { 
                socketId, 
                streaming 
            });
            
            if (!customerResult.success) {
                throw new Error(`Customer summary generation failed: ${customerResult.error}`);
            }

            customerSummary = customerResult.data.customerSummary;

            // Final result
            const result = {
                success: true,
                data: {
                    technicalRCA,
                    customerSummary,
                    ticketData,
                    rcaFields,
                    generatedAt: new Date().toISOString()
                }
            };

            // Emit completion event and cleanup
            if (streamingHandler) {
                streamingHandler.emitCompletion({
                    result: result.data
                });
                streamingHandler.cleanup();
            }

            return result;

        } catch (error) {
            console.error('❌ Error in generateCompleteRCA:', error);
            
            if (options.socketId) {
                WebSocketUtils.emitError(options.socketId, {
                    error: error.message,
                    type: 'complete_rca'
                }, config.websocket.events.rcaError);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create technical RCA prompt based on example format
     */
    createTechnicalRCAPrompt(ticketData, rcaFields) {
        return `
You are an expert IT analyst specializing in Root Cause Analysis (RCA). Generate a comprehensive technical RCA report based on the provided ticket information and RCA fields.

TICKET INFORMATION:
- Ticket ID: ${ticketData.ticket_id || 'N/A'}
- Short Description: ${ticketData.short_description || 'N/A'}
- Description: ${ticketData.description || 'N/A'}
- Category: ${ticketData.category || 'N/A'}
- Priority: ${ticketData.priority || 'N/A'}
- Impact: ${ticketData.impact || 'N/A'}
- Source: ${ticketData.source || 'N/A'}

RCA FIELDS PROVIDED:
1. Problem: ${rcaFields.problem}
2. Timeline: ${rcaFields.timeline}
3. Impact: ${rcaFields.impact}
4. Root Cause: ${rcaFields.rootCause}
5. Corrective Actions: ${rcaFields.correctiveActions}

Please generate a detailed technical RCA report following this structure:

**Section A - Root Cause Analysis**

**Issue Identification:**
[Provide detailed issue identification based on the problem and timeline information]

**Findings:**
[Create multiple findings based on the root cause analysis. Each finding should include:
- Finding X: [Description of what was discovered]
- RCA: [Root cause analysis for this specific finding]]

**Additional RCA Detail:**
[If applicable, provide tables, data, or additional technical details that support the findings]

**Section B - Corrective Action Plan**

**Actions:**
[List all corrective actions with:
- Related to Finding X: [Action items]
- Target Completion dates
- Detailed implementation steps]

Important Guidelines:
1. Use professional, technical language appropriate for IT operations
2. Include specific dates, times, and technical details where relevant
3. Structure findings logically with clear RCA explanations
4. Ensure corrective actions are actionable and have realistic timelines
5. Reference the provided RCA fields throughout the analysis
6. Make the report comprehensive but concise
7. Use the exact format structure shown in the example

Generate a complete technical RCA report now:`;
    }

    /**
     * Create customer-friendly summary prompt
     */
    createCustomerFriendlyPrompt(technicalRCA, ticketData) {
        return `
You are a customer service expert who specializes in translating technical IT issues into clear, comprehensive customer-friendly explanations.

TICKET INFORMATION:
- Issue: ${ticketData.short_description || 'N/A'}
- Category: ${ticketData.category || 'N/A'}
- Priority: ${ticketData.priority || 'N/A'}

TECHNICAL RCA (FOR REFERENCE):
${technicalRCA}

Please create a comprehensive customer-friendly summary that includes the following sections:

**WHAT HAPPENED:**
- Explain the issue that occurred in simple, non-technical terms
- Describe when it happened and how long it lasted
- Explain who was affected and how

**ROOT CAUSE:**
- Explain the underlying cause in simple terms
- Avoid technical jargon but be specific enough to be informative
- Help the customer understand why this happened

**WHAT WE DID TO FIX IT:**
- Describe the immediate actions taken to resolve the issue
- Explain the step-by-step resolution process in simple terms
- Mention any temporary workarounds that were implemented

**PREVENTIVE MEASURES:**
- Describe what steps have been taken to prevent this from happening again
- Explain any system improvements or process changes
- Mention any monitoring or safeguards that have been put in place

**ASSURANCE AND NEXT STEPS:**
- Reassure the customer about service reliability
- Mention any ongoing monitoring or follow-up activities
- Provide confidence that similar issues will be prevented

Requirements:
- Length: 300-2000 characters (aim for comprehensive but readable)
- Use simple, clear language that any customer can understand
- Avoid technical terms like "sys_id", "ACD", "ServiceNow", "API", "server", etc.
- Focus on business impact and customer experience
- Be empathetic and professional
- Use a reassuring and confident tone
- Structure the response with clear sections as outlined above

Generate a comprehensive customer-friendly summary now:`;
    }

    /**
     * Generate streaming RCA with WebSocket
     */
    async generateStreamingRCA(prompt, socketId, type) {
        try {
            // Generate full response
            const fullResponse = await llmProvider.generateText(this.technicalLLM, prompt);
            
            // Stream content using WebSocket utilities
            await WebSocketUtils.streamContent(socketId, fullResponse, {
                eventName: config.websocket.events.rcaGeneration,
                chunkSize: config.streaming.chunkSize,
                delay: config.streaming.delay,
                type,
                metadata: { 
                    contentType: type === 'technical' ? 'technicalRCA' : 'customerSummary' 
                }
            });

            return {
                success: true,
                data: {
                    [type === 'technical' ? 'technicalRCA' : 'customerSummary']: fullResponse.trim()
                }
            };

        } catch (error) {
            console.error(`❌ Error in streaming ${type} RCA:`, error);
            throw error;
        }
    }

    /**
     * Generate streaming customer summary with WebSocket
     */
    async generateStreamingSummary(prompt, socketId, type) {
        try {
            const { resolutionAgent } = require('../ticket-resolution');
            
            // Generate full response
            const fullResponse = await llmProvider.generateText(resolutionAgent.llm, prompt);
            
            // Stream content using WebSocket utilities
            await WebSocketUtils.streamContent(socketId, fullResponse, {
                eventName: config.websocket.events.rcaGeneration,
                chunkSize: config.streaming.chunkSize,
                delay: config.streaming.delay,
                type,
                metadata: { 
                    contentType: 'customerSummary' 
                }
            });

            return {
                success: true,
                data: {
                    customerSummary: fullResponse.trim()
                }
            };

        } catch (error) {
            console.error(`❌ Error in streaming ${type} summary:`, error);
            throw error;
        }
    }


    /**
     * Validate RCA input
     */
    validateRCAInput(ticketData, rcaFields) {
        const errors = [];
        
        if (!ticketData) {
            errors.push('Ticket data is required');
        }
        
        if (!rcaFields) {
            errors.push('RCA fields are required');
        } else {
            // Check required RCA fields
            for (const field of config.validation.requiredFields) {
                if (field === 'ticketData') continue;
                
                if (!rcaFields[field]) {
                    errors.push(`Missing required RCA field: ${field}`);
                } else {
                    // Validate field length
                    const limits = config.validation.textLimits[field];
                    if (limits) {
                        const length = rcaFields[field].length;
                        if (length < limits.min) {
                            errors.push(`${field} must be at least ${limits.min} characters`);
                        }
                        if (length > limits.max) {
                            errors.push(`${field} must not exceed ${limits.max} characters`);
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
}

module.exports = new RCAGenerationAgent();
