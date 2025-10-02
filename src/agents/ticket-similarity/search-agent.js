/**
 * Ticket Similarity Search Agent - Refactored
 * Uses shared components with functional approach
 */

const { providers, vectorStore, utils } = require('../shared');
const qdrantService = require('../../services/qdrantService');
const config = require('./config');

// Extract specific functions from organized modules
const { createEmbeddings } = providers.embedding;
const { createLLM } = providers.llm;
const { ensureCollection, searchSimilar } = vectorStore.qdrant;
const { createWeightedText } = utils.textProcessing;
const { validateRequiredFields } = utils.validation;
const { createSuccessResponse, createErrorResponse, createHealthResponse } = utils.responseFormatting;

// Module-level state
let embeddings = null;
let llm = null;
let qdrantClient = null;
let initialized = false;

/**
 * Initialize the search agent
 */
async function initialize() {
    if (initialized) return;
    
    try {
        console.log('🚀 Initializing Ticket Similarity Search Agent...');
        
        // Create providers using shared utilities
        embeddings = createEmbeddings();
        llm = createLLM('gemini', { temperature: 0.1 }); // Low temperature for consistent responses
        
        // Get Qdrant client
        qdrantClient = qdrantService.getClient();
        
        // Ensure collection exists
        await ensureCollection(
            qdrantClient,
            config.vectorDb.collectionName,
            config.vectorDb.vectorSize
        );
        
        initialized = true;
        console.log('✅ Ticket Similarity Search Agent initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize search agent:', error);
        throw error;
    }
}

/**
 * Validate ticket input
 */
function validateTicketInput(ticket) {
    // Basic required fields validation
    const requiredValidation = validateRequiredFields(ticket, config.validation.requiredFields);
    if (!requiredValidation.isValid) {
        return requiredValidation;
    }
    
    // Additional validation for ticket-specific rules
    const errors = [];
    
    // Check text field lengths
    const limits = config.validation.textLimits;
    for (const [field, limit] of Object.entries(limits)) {
        const value = ticket[field];
        if (value) {
            if (value.length < limit.min) {
                errors.push(`${field} must be at least ${limit.min} characters`);
            }
            if (value.length > limit.max) {
                errors.push(`${field} must be no more than ${limit.max} characters`);
            }
        }
    }
    
    // Check field types
    const requiredFields = [...config.validation.requiredFields, ...config.validation.optionalFields];
    for (const field of requiredFields) {
        if (ticket[field] && typeof ticket[field] !== 'string') {
            errors.push(`${field} must be a string`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Preprocess ticket data
 */
function preprocessTicket(ticket) {
    return {
        ...ticket,
        short_description: ticket.short_description?.trim(),
        description: ticket.description?.trim(),
        category: ticket.category?.trim(),
        source: ticket.source?.trim()
    };
}

/**
 * Calculate field-specific similarity scores
 */
function calculateFieldSimilarity(queryTicket, candidateTicket) {
    // Simple Jaccard similarity for text fields
    const textSimilarity = (text1, text2) => {
        if (!text1 || !text2) return 0;
        
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    };
    
    return {
        short_description: textSimilarity(queryTicket.short_description, candidateTicket.short_description),
        description: textSimilarity(queryTicket.description, candidateTicket.description),
        category: (queryTicket.category === candidateTicket.category) ? 1.0 : 0.0,
        source: (queryTicket.source === candidateTicket.source) ? 1.0 : 0.0
    };
}

/**
 * Calculate weighted confidence score
 */
function calculateWeightedScore(fieldSimilarities, semanticScore) {
    const weights = config.textProcessing.fieldWeights;
    
    // Normalize semantic score to 0-1 range
    const normalizedSemanticScore = Math.max(0, Math.min(1, semanticScore));
    
    // Calculate field-specific score
    const fieldScore = 
        (fieldSimilarities.short_description * weights.short_description) +
        (fieldSimilarities.description * weights.description) +
        (fieldSimilarities.category * weights.category) +
        (fieldSimilarities.source * weights.source);
    
    // Combine semantic (70%) + field-specific (30%)
    const finalScore = (normalizedSemanticScore * 0.7) + (fieldScore * 0.3);
    
    return Math.min(Math.max(finalScore, 0), 1.0);
}

/**
 * Format date for consistent output
 */
function formatDate(dateObj) {
    if (!dateObj) return null;
    if (dateObj.$date) return new Date(dateObj.$date).toISOString();
    if (dateObj instanceof Date) return dateObj.toISOString();
    return dateObj;
}

/**
 * Search for similar tickets
 */
async function searchSimilarTickets(queryTicket, options = {}) {
    try {
        // Initialize if needed
        if (!initialized) {
            await initialize();
        }
        
        // Validate input
        const validation = validateTicketInput(queryTicket);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Preprocess input
        const processedTicket = preprocessTicket(queryTicket);
        
        console.log('🔍 Searching for similar tickets...');
        
        // Create weighted text for embedding using shared utility
        const queryText = createWeightedText(
            processedTicket,
            config.textProcessing.fieldWeights
        );
        
        console.log('🔍 Debug: Query text for embedding:', queryText);
        
        // Generate embedding
        const queryVector = await embeddings.embedQuery(queryText);
        
        // Search in Qdrant using shared utility
        const searchResults = await searchSimilar(
            qdrantClient,
            config.vectorDb.collectionName,
            queryVector,
            config.vectorDb.topK
        );
        
        console.log(`🔍 Found ${searchResults.length} potential matches`);
        
        // Process and enhance results
        const enhancedResults = searchResults.map((result) => {
            const semanticScore = result.score;
            const candidateTicket = result.payload || {};
            
            // Calculate field-specific similarities
            const fieldSimilarities = calculateFieldSimilarity(queryTicket, candidateTicket);
            
            // Calculate final weighted score
            const confidence_score = calculateWeightedScore(fieldSimilarities, semanticScore);
            
            return {
                ticket_id: candidateTicket.ticket_id,
                source: candidateTicket.source,
                short_description: candidateTicket.short_description,
                description: candidateTicket.description,
                category: candidateTicket.category,
                subcategory: candidateTicket.subcategory,
                status: candidateTicket.status,
                priority: candidateTicket.priority,
                impact: candidateTicket.impact,
                urgency: candidateTicket.urgency,
                opened_time: formatDate(candidateTicket.opened_time),
                closed_time: formatDate(candidateTicket.closed_time),
                resolved_time: formatDate(candidateTicket.resolved_time),
                assigned_to: candidateTicket.assigned_to,
                assignment_group: candidateTicket.assignment_group,
                company: candidateTicket.company,
                location: candidateTicket.location,
                tags: candidateTicket.tags,
                confidence_score: Math.round(confidence_score * 100) / 100,
                semantic_score: Math.round(semanticScore * 100) / 100,
                field_similarities: fieldSimilarities
            };
        });
        
        // Apply filtering and business rules
        const filteredResults = applyBusinessRules(enhancedResults, queryTicket, options);
        
        return filteredResults;
    } catch (error) {
        console.error('❌ Error searching for similar tickets:', error);
        throw error;
    }
}

/**
 * Apply business rules for filtering
 */
function applyBusinessRules(results, queryTicket, options = {}) {
    let filteredResults = results.filter(ticket => {
        // Remove the query ticket itself
        if (queryTicket.ticket_id && ticket.ticket_id === queryTicket.ticket_id) {
            return false;
        }
        
        // Apply minimum confidence threshold
        return ticket.confidence_score >= config.response.minConfidenceScore;
    });
    
    // Apply additional business rules from options
    if (options.businessRules) {
        const rules = options.businessRules;
        
        if (rules.allowedSources?.length > 0) {
            filteredResults = filteredResults.filter(ticket =>
                rules.allowedSources.includes(ticket.source)
            );
        }
        
        if (rules.allowedCategories?.length > 0) {
            filteredResults = filteredResults.filter(ticket =>
                rules.allowedCategories.includes(ticket.category)
            );
        }
        
        if (rules.allowedStatuses?.length > 0) {
            filteredResults = filteredResults.filter(ticket =>
                rules.allowedStatuses.includes(ticket.status)
            );
        }
    }
    
    // Sort by confidence (descending)
    filteredResults.sort((a, b) => b.confidence_score - a.confidence_score);
    
    // Limit results
    filteredResults = filteredResults.slice(0, config.response.maxResults);
    
    // Add ranking information
    return filteredResults.map((ticket, index) => ({
        ...ticket,
        rank: index + 1,
        confidence_percentage: Math.round(ticket.confidence_score * 100)
    }));
}

/**
 * Generate explanation for similarity results
 */
async function generateSimilarityExplanation(inputTicket, similarTickets) {
    try {
        // Initialize if needed
        if (!initialized) {
            await initialize();
        }
        
        if (!llm || !similarTickets || similarTickets.length === 0) {
            return null;
        }
        
        const prompt = createExplanationPrompt(inputTicket, similarTickets);
        const response = await providers.llm.generateText(llm, prompt, {
            agentName: 'ticket-similarity',
            operation: 'generateExplanation',
            metadata: {
                inputTicketId: inputTicket.ticket_id || 'unknown',
                similarTicketsCount: similarTickets.length,
                category: inputTicket.category
            },
            tags: ['ticket-similarity', 'explanation', inputTicket.category?.toLowerCase()]
        });
        
        return response;
    } catch (error) {
        console.error('❌ Error generating explanation:', error);
        return null;
    }
}

/**
 * Create explanation prompt
 */
function createExplanationPrompt(inputTicket, similarTickets) {
    return `You are an expert in IT ticket analysis. Analyze why the following tickets are similar to the input ticket.

Input Ticket:
- Short Description: ${inputTicket.short_description}
- Description: ${inputTicket.description}
- Category: ${inputTicket.category}
- Source: ${inputTicket.source}

Similar Tickets Found:
${similarTickets.slice(0, 3).map((ticket, index) => `
${index + 1}. Ticket ID: ${ticket.ticket_id} (Confidence: ${ticket.confidence_percentage}%)
   - Short Description: ${ticket.short_description}
   - Description: ${ticket.description}
   - Category: ${ticket.category}
   - Source: ${ticket.source}
`).join('\n')}

Provide a brief explanation of why these tickets are similar, focusing on:
1. Problem description and symptoms
2. Category and context
3. Technical details or error patterns

Keep the explanation concise and focused on the most relevant similarities.`;
}

/**
 * Health check for the search agent
 */
async function healthCheck() {
    try {
        if (!initialized) {
            await initialize();
        }
        
        // Test embedding generation with Langfuse tracking
        await embeddings.embedQuery('test query');
        
        // Test Qdrant connection
        await qdrantClient.getCollections();
        
        return createHealthResponse('healthy', {
            embeddings: 'healthy',
            vectorStore: 'healthy',
            llm: llm ? 'healthy' : 'not_initialized'
        });
    } catch (error) {
        return createHealthResponse('unhealthy', {
            error: error.message
        });
    }
}


/**
 * Get agent capabilities
 */
function getCapabilities() {
    return {
        supported_fields: [...config.validation.requiredFields, ...config.validation.optionalFields],
        required_fields: config.validation.requiredFields,
        field_weights: config.textProcessing.fieldWeights,
        min_confidence_threshold: config.response.minConfidenceScore,
        max_results: config.response.maxResults,
        text_limits: config.validation.textLimits
    };
}

module.exports = {
    initialize,
    searchSimilarTickets,
    generateSimilarityExplanation,
    healthCheck,
    getCapabilities,
    validateTicketInput,
    preprocessTicket
};
