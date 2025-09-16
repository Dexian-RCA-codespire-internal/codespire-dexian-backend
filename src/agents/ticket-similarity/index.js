/**
 * Ticket Similarity Agent Module Entry Point - Refactored
 * Uses shared components with functional approach
 */

const searchAgent = require('./search-agent');
const service = require('./service');
const config = require('./config');

module.exports = {
    // Main service interface
    service,
    
    // Search agent for direct access
    searchAgent,
    
    // Configuration
    config,
    
    // Convenience methods
    findSimilarTickets: (inputTicket, options) => service.findSimilarTickets(inputTicket, options),
    generateExplanation: (inputTicket, results) => service.generateSimilarityExplanation(inputTicket, results),
    healthCheck: () => service.checkHealth(),
    getCapabilities: () => service.getCapabilities(),
    
    // Legacy support - for backward compatibility
    createAgent: (options = {}) => ({
        findSimilarTickets: (ticket, opts) => service.findSimilarTickets(ticket, { ...options, ...opts }),
        generateSimilarityExplanation: (ticket, results) => service.generateSimilarityExplanation(ticket, results),
        healthCheck: () => service.checkHealth(),
        getCapabilities: () => service.getCapabilities(),
        validateTicketInput: (ticket) => service.validateTicketInput(ticket)
    })
};
