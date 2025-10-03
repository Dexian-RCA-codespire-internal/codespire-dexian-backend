/**
 * Langfuse Observability - Simple Modular Approach
 * Based on reference implementation from languse-reference/langfuse.js
 * 
 * Uses Langfuse Node.js SDK with trace/span/generation pattern
 */

const { Langfuse } = require('langfuse');

// Global Langfuse instance
let langfuse = null;
let initialized = false;

/**
 * Check if Langfuse is properly configured
 * @returns {boolean} True if all required environment variables are set
 */
function isConfigured() {
    return !!(
        process.env.LANGFUSE_PUBLIC_KEY && 
        process.env.LANGFUSE_SECRET_KEY && 
        process.env.LANGFUSE_HOST
    );
}

/**
 * Initialize Langfuse
 * Call this once at application startup
 * @returns {boolean} True if initialization was successful
 */
function initializeLangfuse() {
    try {
        if (!isConfigured()) {
            console.warn('⚠️ Langfuse keys not configured, monitoring disabled');
            return false;
        }

        langfuse = new Langfuse({
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            baseUrl: process.env.LANGFUSE_HOST,
            flushAt: 1, // Flush immediately for real-time monitoring
            flushInterval: 1000 // Flush every second
        });

        initialized = true;
        console.log('✅ Langfuse initialized successfully');
        console.log('   Host:', process.env.LANGFUSE_HOST);
        console.log('   Public Key:', process.env.LANGFUSE_PUBLIC_KEY?.substring(0, 15) + '...');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Langfuse:', error);
        return false;
    }
}

/**
 * Get Langfuse instance
 * @returns {Object|null} Langfuse instance or null
 */
function getLangfuse() {
    if (!initialized) {
        console.warn('⚠️ Langfuse not initialized');
        return null;
    }
    return langfuse;
}

/**
 * Create a trace for agent operations
 * @param {string} name - Trace name
 * @param {Object} input - Input data
 * @param {Object} metadata - Additional metadata
 * @returns {Object|null} Trace instance
 */
function createTrace(name, input, metadata = {}) {
    const langfuseInstance = getLangfuse();
    if (!langfuseInstance) return null;

    try {
        return langfuseInstance.trace({
            name,
            input,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        console.error('❌ Failed to create Langfuse trace:', error);
        return null;
    }
}

/**
 * Create a span for specific operations within a trace
 * @param {Object} trace - Parent trace instance
 * @param {string} name - Span name
 * @param {Object} input - Input data
 * @param {Object} metadata - Additional metadata
 * @returns {Object|null} Span instance
 */
function createSpan(trace, name, input, metadata = {}) {
    if (!trace) return null;

    try {
        return trace.span({
            name,
            input,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Failed to create Langfuse span:', error);
        return null;
    }
}

/**
 * Create a generation for LLM calls
 * @param {Object} parent - Parent trace or span
 * @param {string} name - Generation name
 * @param {Object} params - Generation parameters
 * @returns {Object|null} Generation instance
 */
function createGeneration(parent, name, params = {}) {
    if (!parent) return null;

    try {
        return parent.generation({
            name,
            model: params.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            input: params.input,
            metadata: {
                ...params.metadata,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Failed to create Langfuse generation:', error);
        return null;
    }
}

/**
 * Update generation with output and token usage
 * @param {Object} generation - Generation instance
 * @param {string} output - LLM output
 * @param {Object} usage - Token usage {promptTokens, completionTokens, totalTokens}
 * @param {Object} metadata - Additional metadata
 */
function updateGeneration(generation, output, usage = {}, metadata = {}) {
    if (!generation) return;

    try {
        generation.end({
            output,
            usage: {
                input: usage.promptTokens || usage.input || 0,
                output: usage.completionTokens || usage.output || 0,
                total: usage.totalTokens || usage.total || 0
            },
            metadata: {
                ...metadata,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Failed to update Langfuse generation:', error);
    }
}

/**
 * End a trace or span
 * @param {Object} traceOrSpan - Trace or span instance
 * @param {Object} output - Output data
 * @param {Object} metadata - Additional metadata
 */
function endTrace(traceOrSpan, output, metadata = {}) {
    if (!traceOrSpan) return;

    try {
        traceOrSpan.update({
            output,
            metadata: {
                ...metadata,
                completedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Failed to end Langfuse trace:', error);
    }
}

/**
 * Flush Langfuse data to ensure it's sent
 * @returns {Promise<void>}
 */
async function flush() {
    const langfuseInstance = getLangfuse();
    if (!langfuseInstance) return;

    try {
        await langfuseInstance.flushAsync();
        console.log('✅ Langfuse data flushed');
    } catch (error) {
        console.error('❌ Failed to flush Langfuse data:', error);
    }
}

/**
 * Shutdown Langfuse client gracefully
 * @returns {Promise<void>}
 */
async function shutdown() {
    const langfuseInstance = getLangfuse();
    if (!langfuseInstance) return;

    try {
        await langfuseInstance.shutdownAsync();
        console.log('✅ Langfuse client shutdown');
    } catch (error) {
        console.error('❌ Failed to shutdown Langfuse client:', error);
    }
}

/**
 * Get Langfuse status
 * @returns {Object} Status information
 */
function getConfigStatus() {
    return {
        initialized,
        configured: isConfigured(),
        baseUrl: process.env.LANGFUSE_HOST || 'not-set',
        publicKey: process.env.LANGFUSE_PUBLIC_KEY ? 'configured' : 'not-set',
        secretKey: process.env.LANGFUSE_SECRET_KEY ? 'configured' : 'not-set'
    };
}

/**
 * Test Langfuse connection
 * @returns {Promise<boolean>} True if connection is working
 */
async function testConnection() {
    if (!isConfigured()) {
        console.log('❌ Langfuse not configured');
        return false;
    }

    try {
        // Initialize if not already done
        if (!initialized) {
            initializeLangfuse();
        }

        const langfuseInstance = getLangfuse();
        if (!langfuseInstance) {
            return false;
        }

        // Create a test trace
        const trace = langfuseInstance.trace({
            name: 'connection-test',
            input: { test: true },
            metadata: { timestamp: new Date().toISOString() }
        });

        trace.update({
            output: { success: true }
        });

        await langfuseInstance.flushAsync();
        
        console.log('✅ Langfuse connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Langfuse connection test failed:', error);
        return false;
    }
}

module.exports = {
    // Initialization
    initializeLangfuse,
    getLangfuse,
    isConfigured,
    
    // Core functions
    createTrace,
    createSpan,
    createGeneration,
    updateGeneration,
    endTrace,
    
    // Lifecycle
    flush,
    shutdown,
    
    // Utilities
    getConfigStatus,
    testConnection
};
