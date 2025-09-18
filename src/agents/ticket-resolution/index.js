/**
 * Ticket Resolution Agent Module Entry Point
 * Uses shared components with functional approach
 */

const resolutionAgent = require('./resolution-agent');
const service = require('./service');
const config = require('./config');

module.exports = {
    // Main service interface
    service,
    
    // Resolution agent for direct access
    resolutionAgent,
    
    // Configuration
    config,
    
    // Convenience methods
    resolveTicket: (ticket, rootCause, options) => service.resolveTicket(ticket, rootCause, options)
};
