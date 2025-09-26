/**
 * Problem Statement Agent Module Entry Point
 * Dedicated module for problem statement generation
 */

const problemStatementAgent = require('./problem-statement-agent');
const service = require('./service');
const config = require('./config');

module.exports = {
    // Main service interface
    service,
    
    // Problem statement agent for direct access
    problemStatementAgent,
    
    // Configuration
    config,
    
    // Convenience methods
    generateProblemStatement: (inputData) => 
        service.generateProblemStatement(inputData),
    checkHealth: () => service.checkHealth(),
    getCapabilities: () => service.getCapabilities(),
    validateInput: (inputData) => service.validateInput(inputData),
    
    // Batch processing
    generateProblemStatementsBatch: (inputDataArray) => 
        service.generateProblemStatementsBatch(inputDataArray),
    
    // Custom problem statement generation
    generateCustomProblemStatement: (inputData, options) => 
        service.generateCustomProblemStatement(inputData, options),
    
    // Get available options
    getAvailableOptions: () => service.getAvailableOptions(),
    
    // Legacy support - for backward compatibility
    createAgent: (options = {}) => ({
        generateProblemStatement: (inputData) => 
            service.generateProblemStatement(inputData),
        checkHealth: () => service.checkHealth(),
        getCapabilities: () => service.getCapabilities(),
        validateInput: (inputData) => service.validateInput(inputData)
    })
};

