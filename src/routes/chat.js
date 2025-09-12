// new file servicenow
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Send message to chatbot
router.post('/send-message', async (req, res) => {
  await chatController.sendMessage(req, res);
});

// Get conversation history
router.get('/history', async (req, res) => {
  await chatController.getHistory(req, res);
});

// Clear conversation history
router.delete('/history', async (req, res) => {
  await chatController.clearHistory(req, res);
});

// Test LLM service connection
router.get('/test-service', async (req, res) => {
  await chatController.testService(req, res);
});

// Get available LLM services
router.get('/services', async (req, res) => {
  await chatController.getAvailableServices(req, res);
});

// Generate response with specific options
router.post('/generate', async (req, res) => {
  await chatController.generateResponse(req, res);
});

// Get welcome message
router.get('/welcome', async (req, res) => {
  await chatController.getWelcomeMessage(req, res);
});

module.exports = router;
