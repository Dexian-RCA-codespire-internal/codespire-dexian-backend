/**
 * Ticket Similarity Agent Module Entry Point
 * Exports the main agent and configuration for easy integration
 */

const TicketSimilarityAgent = require('./agents/ticket-similarity-agent');
const TicketRetriever = require('./tools/ticket-retriever');
const ResultFilter = require('./tools/result-filter');
const { ProviderFactory } = require('./config/langchain-providers');
const API_CONFIG = require('./config/api-config');

module.exports = {
    // Main agent class
    TicketSimilarityAgent,
    
    // Individual components for advanced usage
    TicketRetriever,
    ResultFilter,
    ProviderFactory,
    
    // Configuration
    API_CONFIG,
    
    // Convenience factory function
    createAgent: (options = {}) => new TicketSimilarityAgent(options)
};
