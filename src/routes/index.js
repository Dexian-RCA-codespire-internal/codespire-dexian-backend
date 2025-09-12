const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const llmRoutes = require('./llm');
const s3Routes = require('./s3');
const chatRoutes = require('./chat');

// Mount routes
router.use('/auth', authRoutes);
router.use('/llm', llmRoutes);
router.use('/s3', s3Routes);
router.use('/chat', chatRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Microservice Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth',
      llm: '/llm',
      s3: '/s3',
      chat: '/chat',
    }
  });
});

module.exports = router;
