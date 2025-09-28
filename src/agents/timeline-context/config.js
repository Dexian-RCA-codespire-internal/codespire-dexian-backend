/**
 * Timeline Context Agent Configuration
 * Configuration for generating timeline descriptions and context
 */

module.exports = {
    // LLM Configuration
    llm: {
        provider: process.env.TIMELINE_LLM_PROVIDER || 'gemini',
        model: process.env.TIMELINE_LLM_MODEL || 'gemini-2.0-flash-exp',
        temperature: parseFloat(process.env.TIMELINE_LLM_TEMPERATURE) || 0.2,
        maxTokens: parseInt(process.env.TIMELINE_LLM_MAX_TOKENS) || 300,
        timeout: parseInt(process.env.TIMELINE_LLM_TIMEOUT) || 30000
    },

    // Timeline Generation Settings
    timeline: {
        maxLogEntries: parseInt(process.env.TIMELINE_MAX_LOG_ENTRIES) || 50,
        descriptionLength: {
            min: parseInt(process.env.TIMELINE_MIN_DESCRIPTION_LENGTH) || 20,
            max: parseInt(process.env.TIMELINE_MAX_DESCRIPTION_LENGTH) || 150
        },
        includeTechnicalDetails: process.env.TIMELINE_INCLUDE_TECHNICAL_DETAILS === 'true',
        includeBusinessContext: process.env.TIMELINE_INCLUDE_BUSINESS_CONTEXT === 'true'
    },

    // Validation Rules
    validation: {
        maxProblemStatementLength: parseInt(process.env.TIMELINE_MAX_PROBLEM_STATEMENT_LENGTH) || 2000,
        maxLogMessageLength: parseInt(process.env.TIMELINE_MAX_LOG_MESSAGE_LENGTH) || 1000,
        requiredFields: ['problemStatement', 'ticketCreationTime'],
        allowedLogLevels: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'FATAL', 'TRACE']
    },

    // Error Handling
    errorHandling: {
        fallbackToDefault: process.env.TIMELINE_FALLBACK_TO_DEFAULT === 'true',
        retryAttempts: parseInt(process.env.TIMELINE_RETRY_ATTEMPTS) || 2,
        retryDelay: parseInt(process.env.TIMELINE_RETRY_DELAY) || 1000
    },

    // Default Values
    defaults: {
        descriptionTemplate: "Timeline event analysis based on provided logs and problem statement",
        contextLevel: "technical",
        confidence: 0.8
    }
};
