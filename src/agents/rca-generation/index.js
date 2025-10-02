/**
 * RCA Generation Agent Module Entry Point
 * Uses shared components with functional approach
 */

const rcaAgent = require('./rca-agent');
const service = require('./service');
const config = require('./config');

module.exports = {
    // Main service interface
    service,
    
    // RCA agent for direct access
    rcaAgent,
    
    // Configuration
    config,
    
    // Convenience methods
    generateTechnicalRCA: (ticketData, rcaFields, options) => service.generateTechnicalRCA(ticketData, rcaFields, options),
    generateCustomerSummary: (technicalRCA, ticketData, options) => service.generateCustomerSummary(technicalRCA, ticketData, options),
    generateCompleteRCA: (ticketData, rcaFields, options) => service.generateCompleteRCA(ticketData, rcaFields, options),
    generateStreamingRCA: (ticketData, rcaFields, socketId, options) => service.generateStreamingRCA(ticketData, rcaFields, socketId, options)
};
