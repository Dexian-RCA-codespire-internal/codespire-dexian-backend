const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config();

// Initialize SuperTokens
const { initSuperTokens } = require('./config/supertokens');
initSuperTokens();

console.log('✅ SuperTokens initialized');

// Initialize all databases (MongoDB and Qdrant)
const { initializeDatabase } = require('./config/database');
initializeDatabase().catch(error => {
  console.error('Failed to initialize databases:', error);
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
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    'http://localhost:3001',
  ],
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SuperTokens middleware
const { middleware, errorHandler } = require('supertokens-node/framework/express');
app.use(middleware());

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
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
  console.log(`🔍 SuperTokens route accessed: ${req.path}`);
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
    console.log('🔍 Custom verify-email route accessed');
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
      console.error('Email verification error:', error);
      res.status(400).json({ error: 'Email verification failed' });
    }
  } catch (error) {
    console.error('Verify email route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SuperTokens error handler (must be before your error handler)
app.use(errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
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

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server initialized`);
  
  // Initialize ServiceNow bulk import if enabled and not already completed
  console.log(`🔧 ServiceNow URL: ${config.servicenow.url || 'Not configured'}`);
  if (config.servicenow.enableBulkImport) {
    try {
      // Check if bulk import has already been completed
      const alreadyCompleted = await hasCompletedBulkImport();
      
      if (alreadyCompleted) {
        const status = await getBulkImportStatus();
        console.log('ℹ️ Bulk import already completed. Skipping startup import.');
        console.log(`   - Last import: ${status.lastImportTime}`);
        console.log(`   - Total imported: ${status.totalImported}`);
        console.log('   - Use manual endpoint to force re-import if needed');
      } else {
        console.log('🔄 Starting ServiceNow bulk import (first time setup)...');
        const result = await bulkImportAllTickets({
          batchSize: config.servicenow.bulkImportBatchSize
        });
        
        if (result.success) {
          console.log(`✅ ServiceNow bulk import completed successfully:`);
          console.log(`   - Total tickets imported: ${result.total}`);
          console.log(`   - New tickets: ${result.database.saved}`);
          console.log(`   - Updated tickets: ${result.database.updated}`);
          console.log(`   - Errors: ${result.database.errors}`);
        } else {
          console.error('❌ ServiceNow bulk import failed:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to perform ServiceNow bulk import:', error);
    }
  } else {
    console.log('ℹ️ Bulk import not triggered - disabled (set SERVICENOW_ENABLE_BULK_IMPORT=true to enable)');
  }
  
  // Debug: Log ServiceNow configuration
  console.log('🔧 ServiceNow Configuration:');
  console.log(`   - enablePolling: ${config.servicenow.enablePolling}`);
  console.log(`   - pollingInterval: ${config.servicenow.pollingInterval}`);
  console.log(`   - url: ${config.servicenow.url ? 'Set' : 'Not set'}`);
  console.log(`   - username: ${config.servicenow.username ? 'Set' : 'Not set'}`);
  console.log(`   - enableBulkImport: ${config.servicenow.enableBulkImport}`);
  
  // Initialize ServiceNow polling service if enabled
  if (config.servicenow.enablePolling) {
    try {
      console.log('🚀 Initializing ServiceNow polling service...');
      await pollingService.initialize();
      console.log('✅ ServiceNow polling service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ServiceNow polling service:', error);
    }
  } else {
    console.log('ℹ️ ServiceNow polling is disabled (set SERVICENOW_ENABLE_POLLING=true to enable)');
  }
});

module.exports = { app, server };
