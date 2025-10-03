const express = require('express');
const router = express.Router();

// Import route modules
// const authRoutes = require('./auth'); // Removed - using SuperTokens built-in routes

const emailVerificationRoutes = require('./emailVerification'); // SuperTokens-based email verification
const llmRoutes = require('./llm');
const s3Routes = require('./s3');
const chatRoutes = require('./chat');
const ticketsRoutes = require('./tickets');
const servicenowPollingRoutes = require('./servicenowPolling');
const ticketSimilarityRoutes = require('./ticketSimilarity');
const ticketResolutionRoutes = require('./ticketResolution');
const usersRoutes = require('./users');
const notificationsRoutes = require('./notifications');
const slaRoutes = require('./sla');
const slaMonitoringRoutes = require('./slaMonitoring');

const rcaGenerationRoutes = require('./rcaGeneration');
const autoSuggestionRoutes = require('./autoSuggestion');
const playbookRoutes = require('./playbooks');
const problemStatementRoutes = require('./problemStatement');

const impactAssessmentRoutes = require('./impactAssessment');
const textEnhancementRoutes = require('./textEnhancement');
const rcaRootCauseRoutes = require('./rcaRootCause');
const solutionGenerationRoutes = require('./solutionGeneration');

// Mount routes
// router.use('/auth', authRoutes); // Removed - using SuperTokens built-in routes

router.use('/email-verification', emailVerificationRoutes); // SuperTokens-based email verification
router.use('/users', usersRoutes); // User management routes
router.use('/llm', llmRoutes);
router.use('/s3', s3Routes);
router.use('/tickets', ticketsRoutes);
router.use('/servicenow-polling', servicenowPollingRoutes);
router.use('/ticket-similarity', ticketSimilarityRoutes);
router.use('/tickets', ticketResolutionRoutes);
router.use('/rca', rcaGenerationRoutes);
router.use('/auto-suggestion', autoSuggestionRoutes);
router.use('/chat', chatRoutes);
router.use('/playbooks', playbookRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/sla', slaRoutes);
router.use('/sla/monitoring', slaMonitoringRoutes);
router.use('/problem-statement', problemStatementRoutes);

router.use('/impact-assessment', impactAssessmentRoutes);
router.use('/text-enhancement', textEnhancementRoutes);
router.use('/rca-root-cause', rcaRootCauseRoutes);
router.use('/solution-generation', solutionGenerationRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Codespire Dexian Backend API',
    version: '1.0.0',
    description: 'Microservice backend with AI-powered ticket management and automatic API documentation',
    endpoints: {
      health: '/health',
      auth: '/auth (SuperTokens built-in)',
      users: '/users/profile, /users (admin), /users/{id}/role (admin)',
      emailVerification: '/email-verification/send-otp, /email-verification/send-magic-link, /email-verification/verify-otp, /email-verification/resend',
      llm: '/llm',
      s3: '/s3',
      tickets: '/tickets',
      servicenowPolling: '/servicenow-polling',
      ticketSimilarity: '/ticket-similarity',
      ticketResolution: '/tickets/resolve',
      rcaGeneration: '/rca',
      autoSuggestion: '/auto-suggestion',
      chat: '/chat',
      notifications: '/notifications',
      playbooks: '/playbooks',
      problemStatement: '/problem-statement',
      timelineContext: '/timeline-context',
      impactAssessment: '/impact-assessment',
      textEnhancement: '/text-enhancement',
      rcaRootCause: '/rca-root-cause',
      solutionGeneration: '/solution-generation'
    },
    documentation: {
      swagger: '/api/docs',
      openapi: '/api/docs.json',
    }
  });
});

module.exports = router;
