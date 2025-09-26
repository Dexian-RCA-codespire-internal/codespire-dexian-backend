/**
 * Text Enhancement Agent Module
 * Main entry point for text enhancement functionality
 */

const TextEnhancementService = require('./service');

// Create and export service instance
const textEnhancementService = new TextEnhancementService();

module.exports = {
  textEnhancementService,
  TextEnhancementService
};
