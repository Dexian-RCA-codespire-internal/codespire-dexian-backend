/**
 * Auto-Suggestion Agent Module Entry Point
 * Uses shared components with functional approach
 */

const suggestionAgent = require('./suggestion-agent');
const service = require('./service');
const config = require('./config');

module.exports = {
    // Main service interface
    service,
    
    // Suggestion agent for direct access
    suggestionAgent,
    
    // Configuration
    config,
    
    // Convenience methods
    generateSuggestion: (currentText, reference) => service.generateSuggestion(currentText, reference),
    generateMultipleSuggestions: (currentText, reference, count) => service.generateMultipleSuggestions(currentText, reference, count),
    clearCache: () => service.clearCache(),
    getCacheStats: () => service.getCacheStats()
};
