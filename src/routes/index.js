const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const llmRoutes = require('./llm');
const s3Routes = require('./s3');
const chatRoutes = require('./chat');
const ticketsRoutes = require('./tickets');
const servicenowPollingRoutes = require('./servicenowPolling');
const ticketSimilarityRoutes = require('./ticketSimilarity');
const ticketResolutionRoutes = require('./ticketResolution');
const rcaGenerationRoutes = require('./rcaGeneration');
const autoSuggestionRoutes = require('./autoSuggestion');
const playbookRoutes = require('./playbooks');
const problemStatementRoutes = require('./problemStatement');
const timelineContextRoutes = require('./timelineContext');

// Mount routes
router.use('/auth', authRoutes);
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
router.use('/problem-statement', problemStatementRoutes);
router.use('/timeline-context', timelineContextRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Codespire Dexian Backend API',
    version: '1.0.0',
    description: 'Microservice backend with AI-powered ticket management and automatic API documentation',
    endpoints: {
      health: '/health',
      auth: '/auth',
      llm: '/llm',
      s3: '/s3',
      tickets: '/tickets',
      servicenowPolling: '/servicenow-polling',
      ticketSimilarity: '/ticket-similarity',
      ticketResolution: '/tickets/resolve',
      rcaGeneration: '/rca',
      autoSuggestion: '/auto-suggestion',
      chat: '/chat',
      playbooks: '/playbooks',
      problemStatement: '/problem-statement',
      timelineContext: '/timeline-context'
    },
    documentation: {
      swagger: '/api/docs',
      openapi: '/api/docs.json',
    }
  });
});

module.exports = router;
