/**
 * Auto-Suggestion Agent Configuration
 * Configuration for intelligent text auto-completion functionality
 */

const { config: defaultConfig } = require('../shared');

// Create auto-suggestion configuration
const config = defaultConfig.createRAGAgentConfig('auto-suggestion', {
    // LLM settings for text suggestions
    llm: {
        model: 'gemini-2.0-flash',
        temperature: 0.3, // Lower temperature for more focused suggestions
        maxTokens: 100 // Limited tokens for short suggestions
    },
    
    // Suggestion settings
    suggestion: {
        maxSuggestionLength: 200, // Maximum characters in a suggestion
        minSuggestionLength: 1,   // Minimum characters (single word)
        maxSuggestions: 5,        // Maximum number of alternative suggestions
        minSuggestions: 1,        // Minimum number of suggestions
        contextWindow: 500,       // Characters of context to consider
        triggerLength: 2,         // Minimum characters before triggering suggestions
        // Dynamic count rules
        dynamicCount: {
            shortText: { threshold: 10, count: 1 },      // Very short text: 1 suggestion
            mediumText: { threshold: 50, count: 3 },     // Medium text: 3 suggestions
            longText: { threshold: 100, count: 5 },      // Long text: 5 suggestions
            withContext: { bonus: 1 },                   // +1 if reference context provided
            wordCompletion: { count: 2 },                // Word completion: 2 suggestions
            sentenceCompletion: { count: 3 },            // Sentence completion: 3 suggestions
            contextAware: { count: 4 }                   // Context-aware: 4 suggestions
        }
    },
    
    // Response settings
    response: {
        timeout: 2000,            // Max response time in milliseconds
        cacheEnabled: true,       // Enable caching for common suggestions
        cacheTTL: 300000         // Cache time-to-live (5 minutes)
    },
    
    // Suggestion types
    suggestionTypes: {
        WORD_COMPLETION: 'word_completion',      // Complete current word
        SENTENCE_COMPLETION: 'sentence_completion', // Complete sentence
        CONTEXT_AWARE: 'context_aware'           // Based on reference context
    },
    
    // Validation schema for auto-suggestion input
    validation: {
        requiredFields: ['currentText'],
        optionalFields: ['reference'],
        textLimits: {
            currentText: { min: 1, max: 1000 },
            reference: { min: 0, max: 2000 }
        }
    },
    
    // API endpoints
    endpoints: {
        suggest: '/api/auto-suggestion/suggest',
        health: '/api/auto-suggestion/health'
    },

    // Common suggestion patterns
    patterns: {
        email: {
            greetings: ['Dear', 'Hello', 'Hi', 'Good morning', 'Good afternoon'],
            closings: ['Best regards', 'Sincerely', 'Thank you', 'Kind regards', 'Best'],
            transitions: ['However', 'Additionally', 'Furthermore', 'In conclusion', 'Therefore']
        },
        business: {
            formal: ['Please find attached', 'I would like to', 'Thank you for', 'I am writing to'],
            meeting: ['Let\'s schedule', 'Meeting request', 'Available times', 'Conference room']
        }
    }
});

module.exports = config;
