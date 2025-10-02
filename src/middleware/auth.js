const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const UserRoles = require('supertokens-node/recipe/userroles');
const Session = require('supertokens-node/recipe/session');

const User = require('../models/User');
const SessionService = require('../services/sessionService');
const config = require('../config');

// Basic SuperTokens session verification
const authenticateToken = async (req, res, next) => {
  try {
    await verifySession()(req, res, next);
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    return res.status(401).json({ 
      error: 'Invalid session',
      message: 'Please log in again'
    });
  }
};



// Require email verification
const requireEmailVerification = async (req, res, next) => {
  try {
    const session = req.session;
    if (!session) {
      return res.status(401).json({ 
        error: 'No active session',
        message: 'Please log in'
      });
    }

    const userId = session.getUserId();
    const isVerified = await EmailVerification.isEmailVerified(userId);
    
    if (!isVerified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please verify your email address',
        requiresEmailVerification: true
      });
    }

    next();
  } catch (error) {
    console.error('❌ Email verification check failed:', error);
    return res.status(500).json({ 
      error: 'Verification check failed',
      message: 'Please try again'
    });
  }
};

// Role-based access control
const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      const user = await getUserById(userId);
      
      if (!user || user.role !== role) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Authentication failed' });
    }
  };
};

// Request logging middleware
const logAuthenticatedRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`🔐 Authenticated Request: ${req.method} ${req.path}`, {
    userId: req.session?.getUserId?.(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    console.log(`📤 Response: ${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.session?.getUserId?.(),
      timestamp: new Date().toISOString()
    });
    
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  authenticateToken,

  requireEmailVerification,
  requireRole,
  logAuthenticatedRequest
};
