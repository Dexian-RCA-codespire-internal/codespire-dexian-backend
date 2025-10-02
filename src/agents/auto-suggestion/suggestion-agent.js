/**
 * Auto-Suggestion Agent
 * Handles intelligent text auto-completion similar to Gmail smart compose
 */

const { providers } = require('../shared');
const llmProvider = providers.llm;
const config = require('./config');

class AutoSuggestionAgent {
    constructor() {
        this.initialized = false;
        this.cache = new Map(); // Simple in-memory cache
    }

    /**
     * Initialize the auto-suggestion agent
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Auto-Suggestion Agent...');
            
            // Create LLM instance
            this.llm = llmProvider.createLLM('gemini', {
                model: config.llm.model,
                temperature: config.llm.temperature,
                maxOutputTokens: config.llm.maxTokens
            });
            
            this.initialized = true;
            console.log('✅ Auto-Suggestion Agent initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Auto-Suggestion Agent:', error);
            throw error;
        }
    }

    /**
     * Generate text suggestions based on current text and reference
     */
    async generateSuggestions(currentText, reference = '') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Validate input
            const validation = this.validateInput(currentText, reference);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Check cache first
            const cacheKey = this.createCacheKey(currentText, reference);
            if (config.response.cacheEnabled && this.cache.has(cacheKey)) {
                const cachedResult = this.cache.get(cacheKey);
                if (Date.now() - cachedResult.timestamp < config.response.cacheTTL) {
                    return {
                        success: true,
                        data: {
                            suggestion: cachedResult.suggestion,
                            type: cachedResult.type,
                            confidence: cachedResult.confidence,
                            cached: true
                        }
                    };
                }
            }

            // Determine suggestion type
            const suggestionType = this.determineSuggestionType(currentText, reference);
            
            // Generate suggestion based on type
            let suggestion;
            switch (suggestionType) {
                case config.suggestionTypes.WORD_COMPLETION:
                    suggestion = await this.generateWordCompletion(currentText, reference);
                    break;
                case config.suggestionTypes.SENTENCE_COMPLETION:
                    suggestion = await this.generateSentenceCompletion(currentText, reference);
                    break;
                case config.suggestionTypes.CONTEXT_AWARE:
                    suggestion = await this.generateContextAwareSuggestion(currentText, reference);
                    break;
                default:
                    suggestion = await this.generateGenericSuggestion(currentText, reference);
            }

            // Post-process suggestion
            const processedSuggestion = this.processSuggestion(suggestion, currentText);
            
            // Calculate confidence score
            const confidence = this.calculateConfidence(processedSuggestion, currentText, reference);

            const result = {
                suggestion: processedSuggestion,
                type: suggestionType,
                confidence: confidence
            };

            // Cache the result
            if (config.response.cacheEnabled && processedSuggestion) {
                this.cache.set(cacheKey, {
                    ...result,
                    timestamp: Date.now()
                });
            }

            return {
                success: true,
                data: {
                    ...result,
                    cached: false
                }
            };

        } catch (error) {
            console.error('❌ Error in generateSuggestions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate dynamic suggestion count based on context
     */
    calculateDynamicCount(currentText, reference, suggestionType) {
        const textLength = currentText.trim().length;
        const hasReference = reference && reference.trim().length > 10;
        const rules = config.suggestion.dynamicCount;
        
        let count = 1; // Default minimum
        
        // Base count based on text length
        if (textLength <= rules.shortText.threshold) {
            count = rules.shortText.count;
        } else if (textLength <= rules.mediumText.threshold) {
            count = rules.mediumText.count;
        } else if (textLength <= rules.longText.threshold) {
            count = rules.longText.count;
        } else {
            count = config.suggestion.maxSuggestions;
        }
        
        // Adjust based on suggestion type
        switch (suggestionType) {
            case config.suggestionTypes.WORD_COMPLETION:
                count = Math.max(count, rules.wordCompletion.count);
                break;
            case config.suggestionTypes.SENTENCE_COMPLETION:
                count = Math.max(count, rules.sentenceCompletion.count);
                break;
            case config.suggestionTypes.CONTEXT_AWARE:
                count = Math.max(count, rules.contextAware.count);
                break;
        }
        
        // Bonus for reference context
        if (hasReference) {
            count += rules.withContext.bonus;
        }
        
        // Apply limits
        count = Math.max(config.suggestion.minSuggestions, count);
        count = Math.min(config.suggestion.maxSuggestions, count);
        
        return count;
    }

    /**
     * Determine the type of suggestion needed
     */
    determineSuggestionType(currentText, reference) {
        const trimmedText = currentText.trim();
        
        // If text ends with incomplete word (no space after last word)
        if (!trimmedText.endsWith(' ') && trimmedText.includes(' ')) {
            const words = trimmedText.split(' ');
            const lastWord = words[words.length - 1];
            if (lastWord.length > 0 && lastWord.length < 10) {
                return config.suggestionTypes.WORD_COMPLETION;
            }
        }
        
        // If reference context is provided, use context-aware suggestions
        if (reference && reference.trim().length > 20) {
            return config.suggestionTypes.CONTEXT_AWARE;
        }
        
        // Default to sentence completion
        return config.suggestionTypes.SENTENCE_COMPLETION;
    }

    /**
     * Generate word completion suggestions
     */
    async generateWordCompletion(currentText, reference) {
        // Ensure agent is initialized
        if (!this.initialized) {
            await this.initialize();
        }
        
        const words = currentText.trim().split(' ');
        const incompleteWord = words[words.length - 1];
        const context = words.slice(0, -1).join(' ');

        const prompt = `Complete the word "${incompleteWord}" in this context: "${context}"

Reference context: ${reference || 'None'}

Rules:
1. Only return the completion part of the word (not the whole word)
2. Make it contextually appropriate
3. Keep it simple and common
4. Maximum 15 characters

Word completion:`;

        const completion = await llmProvider.generateText(this.llm, prompt, {
            agentName: 'auto-suggestion',
            operation: 'generateWordCompletion',
            metadata: {
                currentText: currentText?.substring(0, 50) + '...',
                referenceProvided: !!reference
            },
            tags: ['auto-suggestion', 'word-completion']
        });
        return completion.trim();
    }

    /**
     * Generate sentence completion suggestions
     */
    async generateSentenceCompletion(currentText, reference) {
        const prompt = `Continue this text naturally and contextually:

Current text: "${currentText}"
Reference context: ${reference || 'None'}

Rules:
1. Continue with 1-10 words maximum
2. Make it sound natural and flowing
3. Consider the reference context if provided
4. Don't repeat what's already written
5. End at a natural pause (can be mid-sentence)

Continuation:`;

        const completion = await llmProvider.generateText(this.llm, prompt, {
            agentName: 'auto-suggestion',
            operation: 'generateSentenceCompletion',
            metadata: {
                currentText: currentText?.substring(0, 50) + '...',
                referenceProvided: !!reference
            },
            tags: ['auto-suggestion', 'sentence-completion']
        });
        return completion.trim();
    }

    /**
     * Generate context-aware suggestions
     */
    async generateContextAwareSuggestion(currentText, reference) {
        const prompt = `Based on the reference context, suggest the next few words for the current text:

Reference context: "${reference}"
Current text: "${currentText}"

Rules:
1. Use the reference context to inform your suggestion
2. Suggest 1-10 words that would naturally follow
3. Make it relevant to the reference context
4. Keep it concise and helpful
5. Don't repeat existing text

Suggestion:`;

        const suggestion = await llmProvider.generateText(this.llm, prompt, {
            agentName: 'auto-suggestion',
            operation: 'generateContextAwareSuggestion',
            metadata: {
                currentText: currentText?.substring(0, 50) + '...',
                referenceProvided: !!reference
            },
            tags: ['auto-suggestion', 'context-aware']
        });
        return suggestion.trim();
    }

    /**
     * Generate generic suggestions
     */
    async generateGenericSuggestion(currentText, reference) {
        // Check for common patterns first
        const lastWords = currentText.toLowerCase().trim().split(' ').slice(-3).join(' ');
        
        // Email patterns
        if (lastWords.includes('dear') || lastWords.includes('hello')) {
            return this.getPatternSuggestion('email.greetings', currentText);
        }
        
        if (lastWords.includes('regards') || lastWords.includes('sincerely')) {
            return this.getPatternSuggestion('email.closings', currentText);
        }
        
        // Business patterns
        if (lastWords.includes('please') || lastWords.includes('would like')) {
            return this.getPatternSuggestion('business.formal', currentText);
        }
        
        // Fallback to LLM
        const prompt = `Suggest the next 1-5 words for this text:

Text: "${currentText}"

Rules:
1. Natural continuation
2. Professional tone
3. 1-5 words maximum
4. Common usage

Suggestion:`;

        const suggestion = await llmProvider.generateText(this.llm, prompt, {
            agentName: 'auto-suggestion',
            operation: 'generateGenericSuggestion',
            metadata: {
                currentText: currentText?.substring(0, 50) + '...',
                lastWords: currentText.toLowerCase().trim().split(' ').slice(-3).join(' ')
            },
            tags: ['auto-suggestion', 'generic']
        });
        return suggestion.trim();
    }

    /**
     * Get suggestion from predefined patterns
     */
    getPatternSuggestion(patternPath, currentText) {
        const pathParts = patternPath.split('.');
        let patterns = config.patterns;
        
        for (const part of pathParts) {
            patterns = patterns[part];
            if (!patterns) return '';
        }
        
        // Return a random pattern that doesn't repeat current text
        const availablePatterns = patterns.filter(pattern => 
            !currentText.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (availablePatterns.length > 0) {
            return availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        }
        
        return '';
    }

    /**
     * Process and clean up the suggestion
     */
    processSuggestion(suggestion, currentText) {
        if (!suggestion) return '';
        
        let processed = suggestion.trim();
        
        // Remove quotes if present
        processed = processed.replace(/^["']|["']$/g, '');
        
        // Remove any text that repeats what's already in currentText
        const currentWords = currentText.toLowerCase().trim().split(/\s+/);
        const suggestionWords = processed.toLowerCase().split(/\s+/);
        
        // Find where the suggestion starts that doesn't overlap with current text
        let startIndex = 0;
        for (let i = 0; i < suggestionWords.length; i++) {
            if (!currentWords.includes(suggestionWords[i])) {
                startIndex = i;
                break;
            }
        }
        
        processed = processed.split(/\s+/).slice(startIndex).join(' ');
        
        // Limit length
        if (processed.length > config.suggestion.maxSuggestionLength) {
            processed = processed.substring(0, config.suggestion.maxSuggestionLength).trim();
            // Cut at last complete word
            const lastSpace = processed.lastIndexOf(' ');
            if (lastSpace > 0) {
                processed = processed.substring(0, lastSpace);
            }
        }
        
        return processed.trim();
    }

    /**
     * Calculate confidence score for the suggestion
     */
    calculateConfidence(suggestion, currentText, reference) {
        if (!suggestion) return 0;
        
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on suggestion length (not too short, not too long)
        if (suggestion.length >= 3 && suggestion.length <= 50) {
            confidence += 0.2;
        }
        
        // Increase confidence if reference context is provided
        if (reference && reference.length > 10) {
            confidence += 0.15;
        }
        
        // Increase confidence for complete words
        if (!suggestion.includes(' ') || suggestion.split(' ').every(word => word.length > 2)) {
            confidence += 0.1;
        }
        
        // Decrease confidence for very short or very long suggestions
        if (suggestion.length < 2 || suggestion.length > 100) {
            confidence -= 0.2;
        }
        
        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Create cache key for suggestions
     */
    createCacheKey(currentText, reference) {
        const textKey = currentText.toLowerCase().trim().slice(-50); // Last 50 chars
        const refKey = reference ? reference.toLowerCase().trim().slice(0, 50) : ''; // First 50 chars
        return `${textKey}|${refKey}`;
    }

    /**
     * Validate input parameters
     */
    validateInput(currentText, reference) {
        const errors = [];
        
        if (!currentText || typeof currentText !== 'string') {
            errors.push('currentText is required and must be a string');
        } else {
            const limits = config.validation.textLimits.currentText;
            if (currentText.length < limits.min) {
                errors.push(`currentText must be at least ${limits.min} character(s)`);
            }
            if (currentText.length > limits.max) {
                errors.push(`currentText must not exceed ${limits.max} characters`);
            }
        }
        
        if (reference && typeof reference !== 'string') {
            errors.push('reference must be a string');
        } else if (reference) {
            const limits = config.validation.textLimits.reference;
            if (reference.length > limits.max) {
                errors.push(`reference must not exceed ${limits.max} characters`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Clear the suggestion cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            enabled: config.response.cacheEnabled,
            ttl: config.response.cacheTTL
        };
    }
}

module.exports = new AutoSuggestionAgent();
