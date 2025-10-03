const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
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
const { slaMonitoringService } = require('./services/slaMonitoringService');
const config = require('./config');


const app = express();

// Create HTTP server
const server = http.createServer(app);

const PORT = process.env.PORT || 8081;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    process.env.FRONTEND_URL || 'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'st-auth-mode', 'rid', 'fdi-version', 'x-socket-id'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security middleware - global helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net", "https://purecatamphetamine.github.io", "https://*.githubusercontent.com", "https://flagcdn.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Disable CSP completely for SuperTokens dashboard
app.use("/auth/dashboard", helmet({ contentSecurityPolicy: false }));
app.use("/auth", helmet({ 
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "*"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));

// Production logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 },
    stream: {
      write: function(message) {
        console.log(message.trim());
      }
    }
  }));
} else {
  app.use(morgan('dev'));
}

// SuperTokens imports
const supertokens = require('supertokens-node');
const { middleware, errorHandler } = require('supertokens-node/framework/express');

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000000, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Consolidated CORS configuration with SuperTokens support
const corsOrigins = process.env.CORS_ORIGINS ? 
  process.env.CORS_ORIGINS.split(',') : 
  [config.supertokens.appDomain, "http://localhost:3001"];

app.use(
  cors({
    origin: corsOrigins,
    allowedHeaders: ['content-type', ...supertokens.getAllCORSHeaders()],
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200 // For legacy browser support
  })
);

// SuperTokens middleware BEFORE custom routes (Pattern 1: Top-level mount)
app.use(middleware());

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
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
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
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

// Detailed health check for monitoring
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      mongodb: 'unknown',
      qdrant: 'unknown',
      supertokens: 'unknown',
      servicenow: 'unknown'
    }
  };

  try {
    // Check MongoDB
    const mongoose = require('mongoose');
    health.services.mongodb = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch (error) {
    health.services.mongodb = 'error';
  }

  try {
    // Check SuperTokens Core
    const response = await fetch('http://localhost:3567/hello');
    health.services.supertokens = response.ok ? 'connected' : 'disconnected';
  } catch (error) {
    health.services.supertokens = 'error';
  }

  // Check if any service is down
  const hasErrors = Object.values(health.services).some(status => status === 'error' || status === 'disconnected');
  if (hasErrors) {
    health.status = 'DEGRADED';
    res.status(503);
  }

  res.json(health);
});

// Setup Swagger documentation
const { setupSwagger } = require('./swagger');
setupSwagger(app, PORT);

// Serve static email assets
app.use('/email-assets', express.static('public/email-assets'));

// API routes
app.use('/api/v1', require('./routes'));



// Single consolidated session endpoint for SuperTokens compatibility
app.get('/auth/session', async (req, res) => {
  try {
    console.log('🔍 Session endpoint called');
    
    // Use SuperTokens Session recipe to get session
    const Session = require('supertokens-node/recipe/session');
    
    try {
      const session = await Session.getSession(req, res, { sessionRequired: false });
      
      if (session) {
        console.log('✅ Valid session found for user:', session.getUserId());
        
        // Check if user still exists in SuperTokens
        try {
          const EmailPassword = require('supertokens-node/recipe/emailpassword');
          const user = await EmailPassword.getUserById(session.getUserId());
          
          if (!user) {
            console.log('❌ User no longer exists in SuperTokens, invalidating session');
            await Session.revokeSession(session.getHandle());
            return res.status(401).json({
              status: 'UNAUTHORISED',
              message: 'User no longer exists'
            });
          }
          
          const payload = session.getAccessTokenPayload();
          const userRole = payload.role || 'user';
          
          return res.status(200).json({
            status: 'OK',
            session: {
              userId: session.getUserId(),
              role: userRole,
              email: payload.email || '',
              name: payload.name || '',
              sessionHandle: session.getHandle(),
              tenantId: session.getTenantId(),
              accessTokenPayload: payload
            }
          });
        } catch (userCheckError) {
          console.log('❌ Error checking user existence:', userCheckError.message);
          try {
            await Session.revokeSession(session.getHandle());
          } catch (revokeError) {
            console.log('⚠️ Error revoking session:', revokeError.message);
          }
          return res.status(401).json({
            status: 'UNAUTHORISED',
            message: 'Session validation failed'
          });
        }
      } else {
        console.log('❌ No valid session found');
        return res.status(401).json({
          status: 'UNAUTHORISED',
          message: 'No valid session found'
        });
      }
    } catch (sessionError) {
      console.log('❌ Session verification failed:', sessionError.message);
      return res.status(401).json({
        status: 'UNAUTHORISED',
        message: 'Session verification failed'
      });
    }
  } catch (error) {
    console.error('❌ Error in session endpoint:', error);
    return res.status(500).json({
      status: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Compatibility route for /api/v1/auth/session (redirects to main session endpoint)
app.get('/api/v1/auth/session', async (req, res) => {
  // Redirect to the main session endpoint to avoid duplication
  req.url = '/auth/session';
  return app._router.handle(req, res);
});

// Custom email verification route for magic links (moved to avoid SuperTokens conflicts)
app.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required',
        message: 'Please provide a valid verification token'
      });
    }

    console.log('🔍 Email verification attempt with token:', token);

    // Use SuperTokens to verify the email
    const EmailVerification = require('supertokens-node/recipe/emailverification');
    const supertokens = require('supertokens-node');
    
    try {
      const response = await EmailVerification.verifyEmailUsingToken("public", token);
      
      if (response.status === "OK") {
        console.log('✅ Email verified successfully for user:', response.userId);
        
        // Send welcome email
        const emailService = require('./services/emailService');
        await emailService.sendWelcomeEmail(response.user.email, response.user.email);
        
        return res.status(200).json({
          success: true,
          message: 'Email verified successfully! You can now login.',
          userId: response.userId,
          email: response.user.email
        });
      } else {
        console.log('❌ Email verification failed:', response);
        return res.status(400).json({
          error: 'Email verification failed',
          message: 'Invalid or expired verification token'
        });
      }
    } catch (error) {
      console.error('❌ Email verification error:', error);
      return res.status(400).json({
        error: 'Email verification failed',
        message: error.message || 'Invalid or expired verification token'
      });
    }
  } catch (error) {
    console.error('❌ Email verification route error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong during email verification'
    });
  }
});

// SuperTokens error handler (must be before your error handler)
app.use(errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error('🚨 Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('user-agent'),
    ip: req.ip
  });

  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Prepare error response
  const errorResponse = {
    error: 'Something went wrong!',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  // Add detailed error message in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  } else {
    // In production, only show generic message
    errorResponse.message = 'Internal server error';
  }

  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize WebSocket service
webSocketService.initialize(server);

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}/health`);
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

  // Auto-trigger bulk import if database is empty (regardless of bulk import state)
  try {
    const { getTicketStats } = require('./services/ticketsService');
    const stats = await getTicketStats('ServiceNow');
    
    if (stats.success && stats.data.total === 0) {
      console.log('🔍 Database is empty - auto-triggering bulk import...');
      console.log('ℹ️ First-time setup detected. This may take a few minutes.');
      
      // Reset bulk import state to allow fresh import
      const { resetBulkImportState } = require('./services/servicenowIngestionService');
      await resetBulkImportState();
      console.log('🔄 Bulk import state reset for fresh import');
      
      // Trigger bulk import
      const { bulkImportAllTickets } = require('./services/servicenowIngestionService');
      const result = await bulkImportAllTickets({
        batchSize: config.servicenow.bulkImportBatchSize,
        force: true // Force import even if state says completed
      });
      
      if (result.success) {
        console.log(`✅ Auto bulk import completed successfully:`);
        console.log(`   - Total tickets imported: ${result.total}`);
        console.log(`   - New tickets: ${result.database.saved}`);
        console.log(`   - Updated tickets: ${result.database.updated}`);
        console.log(`   - Errors: ${result.database.errors}`);
        
        // Emit notification to frontend about completion
        webSocketService.emitNotification(
          `Initial data import completed: ${result.total} tickets loaded`,
          'success'
        );
      } else {
        console.error('❌ Auto bulk import failed:', result.error);
        webSocketService.emitNotification(
          'Initial data import failed. Please check server logs.',
          'error'
        );
      }
    } else if (stats.success) {
      console.log(`ℹ️ Database contains ${stats.data.total} tickets - no auto-import needed`);
    }
  } catch (error) {
    console.error('❌ Failed to check database status for auto-import:', error);
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
      
      // Reset polling status to healthy on server startup
      console.log('🔄 Resetting polling status to healthy on startup...');
      await pollingService.resetPollingStatus();
      console.log('✅ Polling status reset to healthy');
    } catch (error) {
      console.error('❌ Failed to initialize ServiceNow polling service:', error);
    }
  } else {
    console.log('ℹ️ ServiceNow polling is disabled (set SERVICENOW_ENABLE_POLLING=true to enable)');
  }

  // Initialize SLA Monitoring Service
  try {
    console.log('🚀 Initializing SLA monitoring service...');
    await slaMonitoringService.initialize();
    console.log('✅ SLA monitoring service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SLA monitoring service:', error);
  }
});

// SuperTokens error handler (must be last)
app.use(errorHandler());

module.exports = app;
