const express = require('express');
const router = express.Router();

// Import route modules
// const authRoutes = require('./auth'); // Removed - using SuperTokens built-in routes
const otpRoutes = require('./otp');
const llmRoutes = require('./llm');
const s3Routes = require('./s3');
const ticketsRoutes = require('./tickets');
const servicenowPollingRoutes = require('./servicenowPolling');
const ticketSimilarityRoutes = require('./ticketSimilarity');
const ticketResolutionRoutes = require('./ticketResolution');
const usersRoutes = require('./users');

// Mount routes
// router.use('/auth', authRoutes); // Removed - using SuperTokens built-in routes
router.use('/otp', otpRoutes); // OTP and Magic Link routes (custom endpoints)
router.use('/users', usersRoutes); // User management routes
router.use('/llm', llmRoutes);
router.use('/s3', s3Routes);
router.use('/tickets', ticketsRoutes);
router.use('/servicenow-polling', servicenowPollingRoutes);
router.use('/ticket-similarity', ticketSimilarityRoutes);
router.use('/tickets', ticketResolutionRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Codespire Dexian Backend API',
    version: '1.0.0',
    description: 'Microservice backend with AI-powered ticket management and automatic API documentation',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth (SuperTokens built-in)',
      users: '/api/v1/users/profile, /api/v1/users (admin), /api/v1/users/{id}/role (admin)',
      otp: '/api/v1/otp/send-otp, /api/v1/otp/verify-otp, /api/v1/otp/resend-otp',
      magicLink: '/api/v1/otp/send-magic-link, /api/v1/otp/verify-magic-link, /api/v1/otp/resend-magic-link',
      llm: '/api/v1/llm',
      s3: '/api/v1/s3',
      tickets: '/api/v1/tickets',
      servicenowPolling: '/api/v1/servicenow-polling',
      ticketSimilarity: '/api/v1/ticket-similarity',
      ticketResolution: '/api/v1/tickets/resolve'
    },
    documentation: {
      swagger: '/api/docs',
      openapi: '/api/docs.json'
    }
  });
});

module.exports = router;
