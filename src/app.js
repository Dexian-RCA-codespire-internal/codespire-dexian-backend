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

// Initialize ServiceNow Polling Service
const { pollingService } = require('./services/servicenowPollingService');
const { bulkImportAllTickets, hasCompletedBulkImport, getBulkImportStatus } = require('./services/servicenowIngestionService');
const config = require('./config');


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

// Custom handler for reset-password route
app.get('/auth/reset-password', async (req, res) => {
  try {
    console.log('🔍 Custom reset-password route accessed');
    const { token } = req.query;

    // Reject accidental GETs with password params
    if (req.query.newPassword || req.query.confirmPassword) {
      console.log('❌ Rejected GET request with password parameters');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Request - Test BG App</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 30px; }
            .button { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌ Invalid Request</div>
            <div class="message">Password reset requests must be made through the proper form. Please use the reset link from your email.</div>
            <a href="http://localhost:3001/forgot-password" class="button">Request New Reset Link</a>
          </div>
        </body>
        </html>
      `);
    }

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Reset Link - Test BG App</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 30px; }
            .button { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌ Invalid Reset Link</div>
            <div class="message">This password reset link is invalid or missing the required token.</div>
            <a href="http://localhost:3001/forgot-password" class="button">Request New Reset Link</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // Return reset password form
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
        <meta name="referrer" content="no-referrer">
        <title>Reset Password - Test BG App</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 50px; }
          .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .title { color: #333; font-size: 24px; margin-bottom: 30px; text-align: center; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 5px; color: #555; font-weight: bold; }
          input[type="password"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; box-sizing: border-box; }
          .button { background-color: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; width: 100%; }
          .button:hover { background-color: #0056b3; }
          .button:disabled { background-color: #6c757d; cursor: not-allowed; }
          .message { margin-top: 20px; padding: 10px; border-radius: 5px; text-align: center; }
          .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .loading { display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">Reset Your Password</div>
          <form id="resetForm" method="post" action="/api/v1/auth/reset-password" autocomplete="off" novalidate>
            <input type="hidden" name="token" value="${token}">
            <div class="form-group">
              <label for="newPassword">New Password:</label>
              <input type="password" id="newPassword" name="newPassword" required minlength="6" autocomplete="new-password" placeholder="Enter your new password">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password:</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6" autocomplete="new-password" placeholder="Confirm your new password">
            </div>
            <button type="submit" class="button" id="submitBtn">Reset Password</button>
            <div class="loading" id="loading">Resetting password...</div>
          </form>
          <div id="message"></div>
        </div>

        <script>
          // Defensive: if this throws, the native POST will still work.
          (function () {
            const form = document.getElementById('resetForm');
            console.debug('[reset] attaching submit handler');
            form.addEventListener('submit', async function (e) {
              e.preventDefault();

              const newPassword = document.getElementById('newPassword').value;
              const confirmPassword = document.getElementById('confirmPassword').value;
              const submitBtn = document.getElementById('submitBtn');
              const loading = document.getElementById('loading');
              const message = document.getElementById('message');

              // Validate passwords match
              if (newPassword !== confirmPassword) {
                message.innerHTML = '<div class="error">Passwords do not match!</div>';
                return;
              }

              // Validate password length
              if (newPassword.length < 6) {
                message.innerHTML = '<div class="error">Password must be at least 6 characters long!</div>';
                return;
              }

              // Show loading state
              submitBtn.disabled = true;
              loading.style.display = 'block';
              message.innerHTML = '';

              try {
                const response = await fetch('/api/v1/auth/reset-password', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    token: '${token}',
                    newPassword: newPassword
                  })
                });

                const data = await response.json();

                if (data.success) {
                  message.innerHTML = '<div class="success">Password reset successfully! Redirecting to login...</div>';
                  setTimeout(() => {
                    window.location.href = 'http://localhost:3001/login';
                  }, 2000);
                } else {
                  message.innerHTML = '<div class="error">Error: ' + data.error + '</div>';
                }
              } catch (error) {
                console.error('Reset password error:', error);
                message.innerHTML = '<div class="error">An error occurred. Please try again.</div>';
              } finally {
                submitBtn.disabled = false;
                loading.style.display = 'none';
              }
            });
            window.addEventListener('error', (ev) => {
              console.error('[reset] runtime error on reset page', ev.error || ev.message);
            });
            console.log('Reset token:', '${token}');
          })();
        </script>
      </body>
      </html>
    `;
    res.set('Cache-Control', 'no-store');
    res.send(html);
  } catch (error) {
    console.error('Reset password route error:', error);
    res.status(500).send('Internal server error');
  }
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

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  
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
  
  // Initialize ServiceNow polling service if enabled
  if (config.servicenow.enablePolling) {
    try {
      await pollingService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize ServiceNow polling service:', error);
    }
  } else {
    console.log('ℹ️ ServiceNow polling is disabled (set SERVICENOW_ENABLE_POLLING=true to enable)');
  }
});

module.exports = app;
