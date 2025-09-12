const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Initialize SuperTokens
const { initSuperTokens } = require('./config/supertokens');
initSuperTokens();

console.log('✅ SuperTokens initialized');

// Initialize MongoDB
const { connectMongoDB } = require('./config/database/mongodb');
connectMongoDB();


const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
