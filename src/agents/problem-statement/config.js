/**
 * Problem Statement Agent Configuration
 * Configuration settings for problem statement generation
 */

const config = {
    // Problem statement generation settings
    problemStatement: {
        // Maximum word count for problem definition
        maxWordCount: 50,
        minWordCount: 30,
        
        // Default values for generation
        defaultIssueType: 'Other',
        defaultSeverity: 'Sev 3 – Moderate',
        defaultBusinessImpact: 'Other',
        
        // Generation parameters
        temperature: 0.1,
        maxTokens: 200,
        timeout: 30000 // 30 seconds
    },
    
    // LLM settings
    llm: {
        provider: 'gemini', // Default LLM provider
        model: 'gemini-2.0-flash-exp',
        fallbackProvider: 'openai',
        fallbackModel: 'gpt-3.5-turbo'
    },
    
    // Validation settings
    validation: {
        // Server log validation
        maxLogEntries: 100,
        maxLogMessageLength: 1000,
        maxDescriptionLength: 2000,
        
        // Required fields
        requiredFields: ['shortDescription'],
        optionalFields: ['description', 'serverLogs']
    },
    
    // Response formatting
    response: {
        includeMetadata: true,
        includeProcessingTime: true,
        includeConfidence: true
    },
    
    // Error handling
    errorHandling: {
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        fallbackToDefault: true
    }
};

module.exports = config;
