const express = require('express');
const { LLMController } = require('../controllers/llmController');
const { doc } = require('../utils/apiDoc');

const router = express.Router();
const llmController = new LLMController();

// Get available LLM services
router.get('/services', 
  doc.get('/llm/services', 'Get list of available LLM services and their status', ['LLM Services']),
  llmController.getAvailableServices.bind(llmController));

// Generate response using specified LLM service
router.post('/generate', 
  doc.post('/llm/generate', 'Generate AI response using specified LLM service', ['LLM Services'], {
    type: 'object',
    properties: {
      service: { 
        type: 'string', 
        enum: ['openai', 'anthropic', 'gemini', 'ollama'],
        description: 'LLM service to use for generation'
      },
      prompt: { 
        type: 'string', 
        description: 'Input prompt for the LLM'
      }
    },
    required: ['service', 'prompt']
  }),
  llmController.generateResponse.bind(llmController));

module.exports = router;
