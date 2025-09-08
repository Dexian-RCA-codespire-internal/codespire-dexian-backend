const express = require('express');
const { LLMController } = require('../controllers/llmController');

const router = express.Router();
const llmController = new LLMController();

// Test all LLM service connections
router.get('/test', llmController.testConnections.bind(llmController));

// Get available LLM services
router.get('/services', llmController.getAvailableServices.bind(llmController));

// Generate response using specified LLM service
router.post('/generate', llmController.generateResponse.bind(llmController));

module.exports = router;
