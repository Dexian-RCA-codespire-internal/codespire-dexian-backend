/**
 * Ticket Suggestion Agent Module Entry Point
 * Dedicated module for ticket resolution suggestions
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
    generateTicketSuggestions: (similarTickets, currentTicket) => 
        service.generateTicketSuggestions(similarTickets, currentTicket),
    checkHealth: () => service.checkHealth(),
    getCapabilities: () => service.getCapabilities(),
    validateInput: (tickets) => service.validateTicketInput(tickets),
    
    // Batch processing
    generateSuggestionsBatch: (ticketSets) => 
        service.generateSuggestionsBatch(ticketSets),
    
    // Custom suggestions
    generateCustomSuggestions: (similarTickets, currentTicket, options) => 
        service.generateCustomSuggestions(similarTickets, currentTicket, options),
    
    // Legacy support - for backward compatibility
    createAgent: (options = {}) => ({
        generateTicketSuggestions: (similarTickets, currentTicket) => 
            service.generateTicketSuggestions(similarTickets, currentTicket),
        checkHealth: () => service.checkHealth(),
        getCapabilities: () => service.getCapabilities(),
        validateInput: (tickets) => service.validateTicketInput(tickets)
    })
};
