/**
 * LLM Provider Utilities
 * Functional utilities for working with different LLM providers
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

/**
 * Available LLM providers configuration
 */
const LLM_CONFIGS = {
    gemini: {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.1,
        maxOutputTokens: 2048,
        createInstance: (config = {}) => new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: config.model || 'gemini-2.0-flash-exp',
            temperature: config.temperature || 0.1,
            maxOutputTokens: config.maxOutputTokens || 2048,
            ...config
        })
    },
    // Add more providers as needed
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
 * @param {string} provider - Provider name (default: 'gemini')
 * @param {Object} config - Optional configuration overrides
 * @returns {Object} LLM instance
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
 * @returns {Array} List of available provider names
 */
function getAvailableLLMProviders() {
    return Object.keys(LLM_CONFIGS);
}

/**
 * Get provider configuration
 * @param {string} provider - Provider name
 * @returns {Object} Provider configuration
 */
function getLLMProviderConfig(provider) {
    return LLM_CONFIGS[provider] || null;
}

/**
 * Generate text using LLM
 * @param {Object} llm - LLM instance
 * @param {string} prompt - Text prompt
 * @returns {Promise<string>} Generated text
 */
async function generateText(llm, prompt) {
    try {
        const response = await llm.invoke(prompt);
        return response.content;
    } catch (error) {
        console.error('Error generating text:', error);
        throw error;
    }
}

/**
 * Generate structured response using LLM
 * @param {Object} llm - LLM instance
 * @param {string} prompt - Text prompt
 * @param {Object} schema - Expected response schema (for future use)
 * @returns {Promise<string>} Generated text
 */
async function generateStructuredResponse(llm, prompt, schema = null) {
    try {
        const response = await llm.invoke(prompt);
        return response.content;
    } catch (error) {
        console.error('Error generating structured response:', error);
        throw error;
    }
}

/**
 * Generate streaming text using LLM with real-time WebSocket streaming
 * @param {Object} llm - LLM instance
 * @param {string} prompt - Text prompt
 * @param {string} socketId - WebSocket socket ID for streaming
 * @param {Object} options - Streaming options
 * @returns {Promise<string>} Complete generated text
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

                // Add delay between chunks
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
        
        // Emit error event
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
