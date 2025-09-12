/**
 * Ticket Similarity Agent
 * Main orchestrator for RAG-based ticket similarity search
 */

const TicketRetriever = require('../tools/ticket-retriever');
const ResultFilter = require('../tools/result-filter');
const { ProviderFactory } = require('../config/langchain-providers');
const API_CONFIG = require('../config/api-config');

class TicketSimilarityAgent {
    constructor(options = {}) {
        this.embeddingProvider = options.embeddingProvider || 'gemini';
        this.llmProvider = options.llmProvider || 'gemini';
        this.retriever = new TicketRetriever(this.embeddingProvider);
        this.filter = new ResultFilter();
        this.llm = null;
        this.initialized = false;
    }

    /**
     * Initialize the agent with all required components
     */
    async initialize() {
        try {
            console.log('Initializing Ticket Similarity Agent...');
            
            // Initialize retriever
            await this.retriever.initialize();
            
            // Initialize LLM for potential future use (reasoning, explanations, etc.)
            this.llm = ProviderFactory.getLLMProvider(this.llmProvider);
            
            this.initialized = true;
            console.log('Ticket Similarity Agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Ticket Similarity Agent:', error);
            throw error;
        }
    }

    /**
     * Validate input ticket data
     */
    validateTicketInput(ticket) {
        const schema = API_CONFIG.requestSchema;
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            if (rules.required && (!ticket[field] || ticket[field].trim() === '')) {
                errors.push(`Field '${field}' is required`);
            }
            
            if (ticket[field] && rules.type === 'string' && typeof ticket[field] !== 'string') {
                errors.push(`Field '${field}' must be a string`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Preprocess ticket data for better similarity matching
     */
    preprocessTicket(ticket) {
        return {
            ...ticket,
            short_description: ticket.short_description?.trim(),
            description: ticket.description?.trim(),
            category: ticket.category?.trim(),
            source: ticket.source?.trim()
        };
    }

    /**
     * Find similar tickets for a given input ticket
     */
    async findSimilarTickets(inputTicket, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Validate input
            const validation = this.validateTicketInput(inputTicket);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Preprocess input
            const processedTicket = this.preprocessTicket(inputTicket);
            
            console.log('Searching for similar tickets...');
            
            // Retrieve similar tickets using vector search
            const similarTickets = await this.retriever.retrieveSimilarTickets(processedTicket);
            
            console.log(`Found ${similarTickets.length} potential matches`);
            
            // Simple filtering: just remove duplicates and apply confidence threshold
            let results = similarTickets.filter(ticket => {
                // Remove the input ticket itself if it has the same ID
                if (inputTicket.ticket_id && ticket.ticket_id === inputTicket.ticket_id) {
                    return false;
                }
                // Apply minimum confidence threshold
                return ticket.confidence_score >= API_CONFIG.response.minConfidenceScore;
            });
            
            // Sort by confidence score (descending)
            results.sort((a, b) => b.confidence_score - a.confidence_score);
            
            // Limit results
            results = results.slice(0, API_CONFIG.response.maxResults);
            
            // Add rank and confidence percentage
            results = results.map((ticket, index) => ({
                ...ticket,
                rank: index + 1,
                confidence_percentage: Math.round(ticket.confidence_score * 100)
            }));
            
            console.log(`Returning ${results.length} results above ${API_CONFIG.response.minConfidenceScore * 100}% confidence`);
            
            return {
                total_results: results.length,
                min_confidence_threshold: API_CONFIG.response.minConfidenceScore,
                results: results
            };
        } catch (error) {
            console.error('Error finding similar tickets:', error);
            throw error;
        }
    }

    /**
     * Generate explanation for similarity results using LLM (optional feature)
     */
    async generateSimilarityExplanation(inputTicket, similarTickets) {
        try {
            if (!this.llm) {
                return null;
            }

            const prompt = this.createExplanationPrompt(inputTicket, similarTickets);
            const response = await this.llm.invoke(prompt);
            
            return response.content;
        } catch (error) {
            console.error('Error generating explanation:', error);
            return null;
        }
    }

    /**
     * Create prompt for similarity explanation
     */
    createExplanationPrompt(inputTicket, similarTickets) {
        return `
You are an expert in IT ticket analysis. Analyze why the following tickets are similar to the input ticket.

Input Ticket:
- Short Description: ${inputTicket.short_description}
- Description: ${inputTicket.description}
- Category: ${inputTicket.category}
- Source: ${inputTicket.source}

Similar Tickets Found:
${similarTickets.results.slice(0, 3).map((ticket, index) => `
${index + 1}. Ticket ID: ${ticket.ticket_id} (Confidence: ${ticket.confidence_percentage}%)
   - Short Description: ${ticket.short_description}
   - Description: ${ticket.description}
   - Category: ${ticket.category}
   - Source: ${ticket.source}
`).join('\n')}

Provide a brief explanation of why these tickets are similar, focusing on the key similarities in:
1. Problem description and symptoms
2. Category and context
3. Technical details or error patterns

Keep the explanation concise and focused on the most relevant similarities.
`;
    }

    /**
     * Batch process multiple tickets for similarity search
     */
    async findSimilarTicketsBatch(tickets, options = {}) {
        const results = [];
        
        for (const ticket of tickets) {
            try {
                const result = await this.findSimilarTickets(ticket, options);
                results.push({
                    input_ticket: ticket,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    input_ticket: ticket,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Health check for the agent
     */
    async healthCheck() {
        try {
            const retrieverHealth = await this.retriever.healthCheck();
            
            return {
                status: retrieverHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
                components: {
                    retriever: retrieverHealth,
                    filter: { status: 'healthy' },
                    llm: this.llm ? { status: 'healthy' } : { status: 'not_initialized' }
                },
                config: {
                    embedding_provider: this.embeddingProvider,
                    llm_provider: this.llmProvider,
                    min_confidence: API_CONFIG.response.minConfidenceScore,
                    max_results: API_CONFIG.response.maxResults
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    /**
     * Get agent configuration and capabilities
     */
    getCapabilities() {
        return {
            supported_fields: Object.keys(API_CONFIG.requestSchema),
            similarity_fields: Object.keys(API_CONFIG.similarity.fieldWeights),
            field_weights: API_CONFIG.similarity.fieldWeights,
            min_confidence_threshold: API_CONFIG.response.minConfidenceScore,
            max_results: API_CONFIG.response.maxResults,
            providers: {
                embedding: this.embeddingProvider,
                llm: this.llmProvider,
                available_embedding_providers: ProviderFactory.listAvailableProviders('embedding'),
                available_llm_providers: ProviderFactory.listAvailableProviders('llm')
            }
        };
    }
}

module.exports = TicketSimilarityAgent;
