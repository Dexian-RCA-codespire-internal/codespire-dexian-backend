const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const morgan = require('morgan'); // Removed - using Winston logger instead
const http = require('http');
const os = require('os');
const logger = require('./utils/logger');
require('dotenv').config();

// Initialize SuperTokens
const { initSuperTokens } = require('./config/supertokens');
initSuperTokens();

logger.info('✅ SuperTokens initialized');

// Initialize all databases (MongoDB and Qdrant)
const { initializeDatabase } = require('./config/database');
initializeDatabase().catch(error => {
  logger.error('Failed to initialize databases:', error);
});

// Initialize ServiceNow Polling Service
const { pollingService } = require('./services/servicenowPollingService');
const { bulkImportAllTickets, hasCompletedBulkImport, getBulkImportStatus } = require('./services/servicenowIngestionService');
const { webSocketService } = require('./services/websocketService');
const config = require('./config');


const app = express();

// Create HTTP server
const server = http.createServer(app);

const PORT = process.env.PORT || 8081;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    'http://localhost:3001', // Frontend URL
    'http://localhost:3002', // Frontend URL
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'st-auth-mode', 'rid', 'fdi-version'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
// app.use(morgan('combined')); // Removed - using Winston logger instead
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SuperTokens middleware
const { middleware, errorHandler } = require('supertokens-node/framework/express');
app.use(middleware());

// Debug: Log all incoming requests
app.use((req, res, next) => {
  logger.info(`🔍 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the server
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             example:
 *               status: "OK"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               uptime: 3600
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint for ServiceNow polling status
app.get('/debug/polling', async (req, res) => {
  try {
    const status = await pollingService.getStatus();
    res.json({
      success: true,
      config: {
        enablePolling: config.servicenow.enablePolling,
        pollingInterval: config.servicenow.pollingInterval,
        servicenowUrl: config.servicenow.url ? 'Set' : 'Not set',
        servicenowUsername: config.servicenow.username ? 'Set' : 'Not set'
      },
      pollingStatus: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup Swagger documentation
const { setupSwagger } = require('./swagger');
setupSwagger(app, PORT);

// API routes
app.use('/api/v1', require('./routes'));

// Note: Password reset is now handled via OTP through /api/v1/auth routes

// SuperTokens routes should be handled by middleware, but let's add a fallback
app.get('/auth/*', (req, res, next) => {
  logger.info(`🔍 SuperTokens route accessed: ${req.path}`);
  // Let SuperTokens middleware handle this
  next();
});

// Test route to verify SuperTokens is working
app.get('/auth/test', (req, res) => {
  res.json({ message: 'SuperTokens route is working' });
});


// Custom handler for verify-email route
app.get('/auth/verify-email', async (req, res) => {
  try {
    logger.info('🔍 Custom verify-email route accessed');
    const { token, rid, tenantId } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Import SuperTokens functions
    const EmailVerification = require('supertokens-node/recipe/emailverification');
    const supertokens = require('supertokens-node');
    
    try {
      // Verify the email using SuperTokens
      const verifyRes = await EmailVerification.verifyEmailUsingToken("public", token);
      
      if (verifyRes.status === "OK") {
        // Update local database
        const User = require('./models/User');
        const user = await User.findBySupertokensUserId(verifyRes.user.id);
        if (user) {
          user.isEmailVerified = true;
          user.emailVerifiedAt = new Date();
          await user.save();
        }
        
        // Return success page
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Email Verified</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: green; }
              .container { max-width: 500px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">✅ Email Verified Successfully!</h1>
              <p>Your email has been verified. You can now log in to your account.</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to Login Page</a></p>
            </div>
          </body>
          </html>
        `;
        res.send(html);
      } else {
        res.status(400).json({ error: 'Invalid or expired token' });
      }
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(400).json({ error: 'Email verification failed' });
    }
  } catch (error) {
    logger.error('Verify email route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SuperTokens error handler (must be before your error handler)
app.use(errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize WebSocket service
webSocketService.initialize(server);

// Get server IP address
function getServerIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  
  return addresses.length > 0 ? addresses[0] : 'localhost';
}

server.listen(PORT, async () => {
  const serverIP = getServerIP();
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌐 IP: ${serverIP}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔌 WebSocket server initialized`);
  
  // Initialize ServiceNow bulk import if enabled and not already completed
  logger.info(`🔧 ServiceNow URL: ${config.servicenow.url || 'Not configured'}`);
  if (config.servicenow.enableBulkImport) {
    try {
      // Check if bulk import has already been completed
      const alreadyCompleted = await hasCompletedBulkImport();
      
      if (alreadyCompleted) {
        const status = await getBulkImportStatus();
        logger.info('ℹ️ Bulk import already completed. Skipping startup import.');
        logger.info(`   - Last import: ${status.lastImportTime}`);
        logger.info(`   - Total imported: ${status.totalImported}`);
        logger.info('   - Use manual endpoint to force re-import if needed');
      } else {
        logger.info('🔄 Starting ServiceNow bulk import (first time setup)...');
        const result = await bulkImportAllTickets({
          batchSize: config.servicenow.bulkImportBatchSize
        });
        
        if (result.success) {
          logger.info(`✅ ServiceNow bulk import completed successfully:`);
          logger.info(`   - Total tickets imported: ${result.total}`);
          logger.info(`   - New tickets: ${result.database.saved}`);
          logger.info(`   - Updated tickets: ${result.database.updated}`);
          logger.info(`   - Errors: ${result.database.errors}`);
        } else {
          logger.error('❌ ServiceNow bulk import failed:', result.error);
        }
      }
    } catch (error) {
      logger.error('❌ Failed to perform ServiceNow bulk import:', error);
    }
  } else {
    logger.info('ℹ️ Bulk import not triggered - disabled (set SERVICENOW_ENABLE_BULK_IMPORT=true to enable)');
  }

  // Auto-trigger bulk import if database is empty (regardless of bulk import state)
  try {
    const { getTicketStats } = require('./services/ticketsService');
    const stats = await getTicketStats('ServiceNow');
    
    if (stats.success && stats.data.total === 0) {
      logger.info('🔍 Database is empty - auto-triggering bulk import...');
      logger.info('ℹ️ First-time setup detected. This may take a few minutes.');
      
      // Reset bulk import state to allow fresh import
      const { resetBulkImportState } = require('./services/servicenowIngestionService');
      await resetBulkImportState();
      logger.info('🔄 Bulk import state reset for fresh import');
      
      // Trigger bulk import
      const { bulkImportAllTickets } = require('./services/servicenowIngestionService');
      const result = await bulkImportAllTickets({
        batchSize: config.servicenow.bulkImportBatchSize,
        force: true // Force import even if state says completed
      });
      
      if (result.success) {
        logger.info(`✅ Auto bulk import completed successfully:`);
        logger.info(`   - Total tickets imported: ${result.total}`);
        logger.info(`   - New tickets: ${result.database.saved}`);
        logger.info(`   - Updated tickets: ${result.database.updated}`);
        logger.info(`   - Errors: ${result.database.errors}`);
        
        // Emit notification to frontend about completion
        webSocketService.emitNotification(
          `Initial data import completed: ${result.total} tickets loaded`,
          'success'
        );
      } else {
        logger.error('❌ Auto bulk import failed:', result.error);
        webSocketService.emitNotification(
          'Initial data import failed. Please check server logs.',
          'error'
        );
      }
    } else if (stats.success) {
      logger.info(`ℹ️ Database contains ${stats.data.total} tickets - no auto-import needed`);
    }
  } catch (error) {
    logger.error('❌ Failed to check database status for auto-import:', error);
  }
  
  // Debug: Log ServiceNow configuration
  logger.info('🔧 ServiceNow Configuration:');
  logger.info(`   - enablePolling: ${config.servicenow.enablePolling}`);
  logger.info(`   - pollingInterval: ${config.servicenow.pollingInterval}`);
  logger.info(`   - url: ${config.servicenow.url ? 'Set' : 'Not set'}`);
  logger.info(`   - username: ${config.servicenow.username ? 'Set' : 'Not set'}`);
  logger.info(`   - enableBulkImport: ${config.servicenow.enableBulkImport}`);
  
  // Initialize ServiceNow polling service if enabled
  if (config.servicenow.enablePolling) {
    try {
      logger.info('🚀 Initializing ServiceNow polling service...');
      await pollingService.initialize();
      logger.info('✅ ServiceNow polling service initialized successfully');
      
      // Reset polling status to healthy on server startup
      logger.info('🔄 Resetting polling status to healthy on startup...');
      await pollingService.resetPollingStatus();
      logger.info('✅ Polling status reset to healthy');
    } catch (error) {
      logger.error('❌ Failed to initialize ServiceNow polling service:', error);
    }
  } else {
    logger.info('ℹ️ ServiceNow polling is disabled (set SERVICENOW_ENABLE_POLLING=true to enable)');
  }
});

module.exports = { app, server };
