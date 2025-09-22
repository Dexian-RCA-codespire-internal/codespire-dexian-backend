/**
 * Auto-Suggestion Service
 * Business logic layer for auto-suggestion operations
 */

const suggestionAgent = require('./suggestion-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class AutoSuggestionService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            await suggestionAgent.initialize();
            this.initialized = true;
        } catch (error) {
            console.error('❌ Failed to initialize Auto-Suggestion Service:', error);
            throw error;
        }
    }

    /**
     * Generate text suggestion
     */
    async generateSuggestion(currentText, reference = '') {
        try {
            const startTime = Date.now();
            
            if (!this.initialized) {
                await this.initialize();
            }

            // Validate minimum trigger length
            if (currentText.length < config.suggestion.triggerLength) {
                return createSuccessResponse({
                    suggestion: '',
                    type: 'none',
                    confidence: 0,
                    message: 'Text too short to generate suggestions'
                }, 'No suggestion generated - text too short');
            }

            const result = await suggestionAgent.generateSuggestions(currentText, reference);
            const processingTime = Date.now() - startTime;
            
            if (result.success) {
                return createSuccessResponse({
                    suggestion: result.data.suggestion,
                    type: result.data.type,
                    confidence: result.data.confidence,
                    cached: result.data.cached || false,
                    processing_time_ms: processingTime,
                    generatedAt: new Date().toISOString()
                }, 'Suggestion generated successfully');
            } else {
                return createErrorResponse(
                    'Failed to generate suggestion',
                    result.error
                );
            }
            
        } catch (error) {
            console.error('❌ Error in generateSuggestion service:', error);
            return createErrorResponse(
                'Failed to generate suggestion',
                error.message
            );
        }
    }

    /**
     * Generate multiple alternative suggestions with dynamic count
     */
    async generateMultipleSuggestions(currentText, reference = '', count = null) {
        try {
            const startTime = Date.now();
            
            if (!this.initialized) {
                await this.initialize();
            }

            // Determine suggestion type first for dynamic count calculation
            const suggestionType = suggestionAgent.determineSuggestionType(currentText, reference);
            
            // Use dynamic count if not specified
            let suggestionCount;
            if (count === null || count === undefined) {
                suggestionCount = suggestionAgent.calculateDynamicCount(currentText, reference, suggestionType);
            } else {
                // Limit user-provided count to maximum allowed
                suggestionCount = Math.min(Math.max(count, config.suggestion.minSuggestions), config.suggestion.maxSuggestions);
            }

            const suggestions = [];
            const maxAttempts = suggestionCount * 2; // Allow more attempts to get diverse suggestions
            let attempts = 0;

            while (suggestions.length < suggestionCount && attempts < maxAttempts) {
                const result = await suggestionAgent.generateSuggestions(currentText, reference);
                attempts++;
                
                if (result.success && result.data.suggestion) {
                    // Check for duplicates (case-insensitive and similarity check)
                    const isDuplicate = suggestions.some(s => {
                        const similarity = this.calculateSimilarity(
                            s.suggestion.toLowerCase(), 
                            result.data.suggestion.toLowerCase()
                        );
                        return similarity > 0.8; // 80% similarity threshold
                    });
                    
                    if (!isDuplicate) {
                        suggestions.push({
                            suggestion: result.data.suggestion,
                            type: result.data.type,
                            confidence: result.data.confidence,
                            cached: result.data.cached || false
                        });
                    }
                }
                
                // Add small delay between attempts to get different results
                if (suggestions.length < suggestionCount && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            const processingTime = Date.now() - startTime;
            
            return createSuccessResponse({
                suggestions,
                requestedCount: suggestionCount,
                actualCount: suggestions.length,
                dynamicCount: count === null || count === undefined,
                suggestionType: suggestionType,
                processing_time_ms: processingTime,
                generatedAt: new Date().toISOString()
            }, `Generated ${suggestions.length} suggestion(s) (${count === null ? 'dynamic' : 'fixed'} count)`);
            
        } catch (error) {
            console.error('❌ Error in generateMultipleSuggestions service:', error);
            return createErrorResponse(
                'Failed to generate multiple suggestions',
                error.message
            );
        }
    }

    /**
     * Generate suggestions with automatic count determination
     */
    async generateAutoSuggestions(currentText, reference = '') {
        return this.generateMultipleSuggestions(currentText, reference, null);
    }

    /**
     * Calculate similarity between two strings (simple implementation)
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Validate suggestion request
     */
    validateSuggestionRequest(requestData) {
        const errors = [];
        
        if (!requestData) {
            errors.push('Request data is required');
            return { isValid: false, errors };
        }

        const { currentText, reference } = requestData;
        
        // Validate currentText
        if (!currentText) {
            errors.push('currentText is required');
        } else if (typeof currentText !== 'string') {
            errors.push('currentText must be a string');
        } else {
            const limits = config.validation.textLimits.currentText;
            if (currentText.length < limits.min) {
                errors.push(`currentText must be at least ${limits.min} character(s)`);
            }
            if (currentText.length > limits.max) {
                errors.push(`currentText must not exceed ${limits.max} characters`);
            }
        }

        // Validate reference (optional)
        if (reference !== undefined && reference !== null) {
            if (typeof reference !== 'string') {
                errors.push('reference must be a string');
            } else {
                const limits = config.validation.textLimits.reference;
                if (reference.length > limits.max) {
                    errors.push(`reference must not exceed ${limits.max} characters`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get service health status
     */
    async getHealthStatus() {
        try {
            const isInitialized = this.initialized;
            const agentInitialized = suggestionAgent.initialized;
            const cacheStats = suggestionAgent.getCacheStats();
            
            return createSuccessResponse({
                service: 'Auto-Suggestion Service',
                status: isInitialized && agentInitialized ? 'healthy' : 'unhealthy',
                initialized: isInitialized,
                agentInitialized: agentInitialized,
                timestamp: new Date().toISOString(),
                config: {
                    model: config.llm.model,
                    maxSuggestionLength: config.suggestion.maxSuggestionLength,
                    maxSuggestions: config.suggestion.maxSuggestions,
                    triggerLength: config.suggestion.triggerLength,
                    cacheEnabled: config.response.cacheEnabled
                },
                cache: cacheStats
            }, 'Auto-Suggestion Service health check completed');
            
        } catch (error) {
            return createErrorResponse(
                'Health check failed',
                error.message
            );
        }
    }

    /**
     * Clear suggestion cache
     */
    async clearCache() {
        try {
            suggestionAgent.clearCache();
            
            return createSuccessResponse({
                message: 'Cache cleared successfully',
                timestamp: new Date().toISOString()
            }, 'Suggestion cache cleared');
            
        } catch (error) {
            return createErrorResponse(
                'Failed to clear cache',
                error.message
            );
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            const stats = suggestionAgent.getCacheStats();
            
            return createSuccessResponse({
                cache: stats,
                timestamp: new Date().toISOString()
            }, 'Cache statistics retrieved');
            
        } catch (error) {
            return createErrorResponse(
                'Failed to get cache statistics',
                error.message
            );
        }
    }
}

// Export singleton instance
module.exports = new AutoSuggestionService();
