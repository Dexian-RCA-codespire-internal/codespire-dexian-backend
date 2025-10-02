/**
 * LLM Provider Utilities
 * Functional utilities for working with different LLM providers
 * With Langfuse observability using trace/span/generation pattern
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const observability = require('../observability/langfuse-simple');

/**
 * Available LLM providers configuration
 */
const LLM_CONFIGS = {
    gemini: {
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        temperature: 0.1,
        maxOutputTokens: 2048,
        createInstance: (config = {}) => new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: config.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            temperature: config.temperature || 0.1,
            maxOutputTokens: config.maxOutputTokens || 2048,
            ...config
        })
    },
    openai: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 2048,
        createInstance: (config = {}) => {
            throw new Error('OpenAI provider not implemented yet');
        }
    }
};

/**
 * Create LLM instance with specified provider and config
 */
function createLLM(provider = 'gemini', config = {}) {
    const providerConfig = LLM_CONFIGS[provider];
    if (!providerConfig) {
        throw new Error(`LLM provider '${provider}' not found. Available: ${Object.keys(LLM_CONFIGS).join(', ')}`);
    }
    
    return providerConfig.createInstance(config);
}

/**
 * Get available LLM providers
 */
function getAvailableLLMProviders() {
    return Object.keys(LLM_CONFIGS);
}

/**
 * Get provider configuration
 */
function getLLMProviderConfig(provider) {
    return LLM_CONFIGS[provider] || null;
}

/**
 * Generate text using LLM with Langfuse tracking
 * @param {Object} llm - LLM instance
 * @param {string} prompt - Text prompt
 * @param {Object} options - Generation options
 * @param {string} options.agentName - Agent name for tracking
 * @param {string} options.operation - Operation name for tracking
 * @param {Object} options.metadata - Additional metadata
 * @param {Array<string>} options.tags - Tags for filtering
 * @param {Object} options.session - Session info {userId, sessionId}
 * @returns {Promise<string>} Generated text
 */
async function generateText(llm, prompt, options = {}) {
    const startTime = Date.now();
    
    // Ensure Langfuse is initialized
    if (!observability.isConfigured()) {
        console.warn('⚠️ Langfuse not configured - tracking disabled');
    } else {
        // Initialize if not already done
        if (!observability.getLangfuse()) {
            observability.initializeLangfuse();
        }
    }
    
    // Create trace for this LLM call
    const traceName = `${options.agentName || 'shared-agent'}-${options.operation || 'generateText'}`;
    const trace = observability.createTrace(traceName, {
        prompt,
        promptLength: prompt.length,
        agentName: options.agentName || 'shared-agent',
        operation: options.operation || 'generateText'
    }, {
        ...options.metadata,
        tags: options.tags || [],
        userId: options.session?.userId,
        sessionId: options.session?.sessionId,
        provider: 'gemini'
    });
    
    try {
        // Create generation for the LLM call
        const generation = observability.createGeneration(trace, 'llm-generation', {
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            input: prompt,
            metadata: {
                agentName: options.agentName,
                operation: options.operation,
                promptLength: prompt.length
            }
        });

        // Make the LLM call
        const response = await llm.invoke(prompt);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // Extract token usage
        const tokenUsage = response.response_metadata?.tokenUsage || response.usage_metadata || null;
        const inputTokens = tokenUsage?.promptTokens || tokenUsage?.promptTokenCount || tokenUsage?.input_tokens || 0;
        const outputTokens = tokenUsage?.completionTokens || tokenUsage?.candidatesTokenCount || tokenUsage?.output_tokens || 0;
        const totalTokens = tokenUsage?.totalTokens || tokenUsage?.totalTokenCount || (inputTokens + outputTokens);
        
        // Update generation with output and token usage
        observability.updateGeneration(generation, response.content, {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: totalTokens
        }, {
            latency,
            success: true
        });
        
        // End trace
        observability.endTrace(trace, {
            response: response.content,
            responseLength: response.content.length,
            success: true
        }, {
            latency,
            tokenUsage: {
                input: inputTokens,
                output: outputTokens,
                total: totalTokens
            }
        });
        
        // Flush data to Langfuse
        await observability.flush();
        
        // Log detailed metrics
        console.log(`📊 LLM Call - Agent: ${options.agentName || 'shared-agent'}, Operation: ${options.operation || 'generateText'}, Latency: ${latency}ms, Tokens: ${totalTokens} (${inputTokens} in, ${outputTokens} out)`);
        
        return response.content;
        
    } catch (error) {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // Log error to trace
        if (trace) {
            observability.endTrace(trace, {
                error: error.message,
                success: false
            }, {
                latency,
                errorType: error.name
            });
            await observability.flush();
        }
        
        console.error('Error generating text:', error);
        
        // Handle quota exceeded errors
        if (error.message && error.message.includes('quota')) {
            console.warn('⚠️ API quota exceeded. Consider upgrading your plan or waiting for quota reset.');
            throw new Error('API quota exceeded. Please try again later or upgrade your plan.');
        }
        
        throw error;
    }
}

/**
 * Generate structured response using LLM with Langfuse tracking
 */
async function generateStructuredResponse(llm, prompt, schema = null, options = {}) {
    const startTime = Date.now();
    
    // Ensure Langfuse is initialized
    if (!observability.isConfigured()) {
        console.warn('⚠️ Langfuse not configured - tracking disabled');
    } else {
        // Initialize if not already done
        if (!observability.getLangfuse()) {
            observability.initializeLangfuse();
        }
    }
    
    // Create trace
    const traceName = `${options.agentName || 'shared-agent'}-${options.operation || 'generateStructuredResponse'}`;
    const trace = observability.createTrace(traceName, {
        prompt,
        schema,
        promptLength: prompt.length,
        agentName: options.agentName || 'shared-agent',
        operation: options.operation || 'generateStructuredResponse'
    }, {
        ...options.metadata,
        tags: options.tags || [],
        userId: options.session?.userId,
        sessionId: options.session?.sessionId,
        provider: 'gemini'
    });
    
    try {
        // Create generation
        const generation = observability.createGeneration(trace, 'llm-structured-generation', {
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            input: prompt,
            metadata: {
                agentName: options.agentName,
                operation: options.operation,
                schema: schema ? 'provided' : 'none',
                promptLength: prompt.length
            }
        });

        // Make the LLM call
        const response = await llm.invoke(prompt);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // Extract token usage
        const tokenUsage = response.response_metadata?.tokenUsage || response.usage_metadata || null;
        const inputTokens = tokenUsage?.promptTokens || tokenUsage?.promptTokenCount || tokenUsage?.input_tokens || 0;
        const outputTokens = tokenUsage?.completionTokens || tokenUsage?.candidatesTokenCount || tokenUsage?.output_tokens || 0;
        const totalTokens = tokenUsage?.totalTokens || tokenUsage?.totalTokenCount || (inputTokens + outputTokens);
        
        // Update generation
        observability.updateGeneration(generation, response.content, {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: totalTokens
        }, {
            latency,
            success: true
        });
        
        // End trace
        observability.endTrace(trace, {
            response: response.content,
            responseLength: response.content.length,
            success: true
        }, {
            latency,
            tokenUsage: {
                input: inputTokens,
                output: outputTokens,
                total: totalTokens
            }
        });
        
        // Flush data
        await observability.flush();
        
        // Log metrics
        console.log(`📊 LLM Call - Agent: ${options.agentName || 'shared-agent'}, Operation: ${options.operation || 'generateStructuredResponse'}, Latency: ${latency}ms, Tokens: ${totalTokens} (${inputTokens} in, ${outputTokens} out)`);
        
        return response.content;
        
    } catch (error) {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // Log error to trace
        if (trace) {
            observability.endTrace(trace, {
                error: error.message,
                success: false
            }, {
                latency,
                errorType: error.name
            });
            await observability.flush();
        }
        
        console.error('Error generating structured response:', error);
        
        // Handle quota errors
        if (error.message && error.message.includes('quota')) {
            console.warn('⚠️ API quota exceeded. Consider upgrading your plan or waiting for quota reset.');
            throw new Error('API quota exceeded. Please try again later or upgrade your plan.');
        }
        
        throw error;
    }
}

/**
 * Generate streaming text using LLM with real-time WebSocket streaming
 */
async function generateStreamingText(llm, prompt, socketId, options = {}) {
    const {
        eventName = 'content_stream',
        chunkSize = 50,
        delay = 100,
        type = 'text',
        metadata = {}
    } = options;

    try {
        const { webSocketService } = require('../../../services/websocketService');
        
        if (!webSocketService.getServer()) {
            throw new Error('WebSocket server not initialized');
        }

        let fullResponse = '';
        let chunkBuffer = '';
        let chunkCount = 0;

        // Emit start event
        webSocketService.getServer().to(socketId).emit(eventName, {
            type,
            chunk: '',
            isStart: true,
            progress: 0,
            timestamp: new Date().toISOString(),
            ...metadata
        });

        // Stream from LLM
        const stream = await llm.stream(prompt);
        
        for await (const chunk of stream) {
            const content = chunk.content || '';
            fullResponse += content;
            chunkBuffer += content;

            // Send chunks when buffer reaches chunkSize
            while (chunkBuffer.length >= chunkSize) {
                const chunkToSend = chunkBuffer.substring(0, chunkSize);
                chunkBuffer = chunkBuffer.substring(chunkSize);
                chunkCount++;

                const progress = Math.min(95, Math.round((chunkCount * chunkSize / (chunkCount * chunkSize + chunkBuffer.length)) * 100));

                webSocketService.getServer().to(socketId).emit(eventName, {
                    type,
                    chunk: chunkToSend,
                    isLast: false,
                    progress,
                    timestamp: new Date().toISOString(),
                    ...metadata
                });

                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Send remaining buffer
        if (chunkBuffer.length > 0) {
            chunkCount++;
            webSocketService.getServer().to(socketId).emit(eventName, {
                type,
                chunk: chunkBuffer,
                isLast: false,
                progress: 95,
                timestamp: new Date().toISOString(),
                ...metadata
            });
        }

        // Send completion event
        webSocketService.getServer().to(socketId).emit(eventName, {
            type,
            chunk: '',
            isLast: true,
            progress: 100,
            timestamp: new Date().toISOString(),
            ...metadata
        });

        return fullResponse;

    } catch (error) {
        console.error('Error in generateStreamingText:', error);
        
        const { webSocketService } = require('../../../services/websocketService');
        if (webSocketService.getServer()) {
            webSocketService.getServer().to(socketId).emit('rca_error', {
                error: error.message,
                type: 'streaming_error',
                timestamp: new Date().toISOString()
            });
        }
        
        throw error;
    }
}

module.exports = {
    createLLM,
    generateText,
    generateStructuredResponse,
    generateStreamingText,
    getAvailableLLMProviders,
    getLLMProviderConfig,
    LLM_CONFIGS
};
