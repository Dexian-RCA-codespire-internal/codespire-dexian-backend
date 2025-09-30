const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const UserRoles = require('supertokens-node/recipe/userroles');
const Session = require('supertokens-node/recipe/session');

const User = require('../models/User');
const SessionService = require('../services/sessionService');
const SessionUtils = require('../utils/sessionUtils');
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

// Enhanced authentication with MongoDB user verification and session management
const authenticateTokenEnhanced = async (req, res, next) => {
  try {
    // First verify SuperTokens session
    await verifySession()(req, res, async (sessionError) => {
      if (sessionError) {
        console.log('❌ Session verification failed:', sessionError.message);
        return res.status(401).json({ 
          error: 'Session verification failed',
          message: 'Please log in again',
          code: 'SESSION_INVALID'
        });
      }

      try {
        const session = req.session;
        const sessionHandle = session.getSessionHandle();

        // Use centralized session validation
        const validation = await SessionUtils.validateSessionAndGetUser(session);
        
        if (!validation.valid) {
          console.log('❌ Session validation failed:', validation.reason);
          
          // Revoke session if it's invalid
          if (validation.sessionRevoked) {
            try {
              await Session.revokeSession(sessionHandle);
            } catch (revokeError) {
              console.warn('⚠️ Could not revoke invalid session:', revokeError.message);
            }
          }
          
          return res.status(401).json({ 
            error: validation.reason,
            message: 'Please log in again',
            code: 'SESSION_INVALID'
          });
        }

        // Update session activity in MongoDB
        await SessionUtils.updateSessionActivity(validation.sessionInfo.userId, sessionHandle);

        // Add comprehensive user info to request
        req.user = validation.user;
        req.user.sessionHandle = sessionHandle;

        // Add session info for logging
        req.sessionInfo = {
          sessionHandle,
          userId: validation.sessionInfo.userId,
          lastActivity: new Date(),
          userAgent: req.get('user-agent'),
          ipAddress: req.ip || req.connection.remoteAddress
        };

        console.log('✅ Enhanced authentication successful:', {
          userId: validation.sessionInfo.userId,
          email: req.user.email,
          role: req.user.role,
          sessionHandle: sessionHandle.substring(0, 8) + '...'
        });

        next();
      } catch (dbError) {
        console.error('❌ Database verification failed:', dbError);
        return res.status(500).json({ 
          error: 'Authentication error',
          message: 'Please try again',
          code: 'AUTH_ERROR'
        });
      }
    });
  } catch (error) {
    console.error('❌ Enhanced authentication error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Please log in again',
      code: 'AUTH_FAILED'
    });
  }
};

// Optional authentication - doesn't block if no session
const authenticateOptional = async (req, res, next) => {
  try {
    await verifySession()(req, res, async (sessionError) => {
      if (sessionError) {
        // No session or invalid session, continue without user context
        req.user = null;
        return next();
      }

      try {
        const session = req.session;
        const userId = session.getUserId();
        
        // Try to get user data but don't block if not found
        const mongoUser = await User.findBySupertokensUserId(userId);
        if (mongoUser && mongoUser.isActive) {
          req.user = {
            id: userId,
            email: mongoUser.email,
            preferences: mongoUser.preferences,
            isActive: mongoUser.isActive,
            isEmailVerified: mongoUser.isEmailVerified
          };
        } else {
          req.user = null;
        }
        
        next();
      } catch (dbError) {
        // Continue without user context on database error
        req.user = null;
        next();
      }
    });
  } catch (error) {
    // Continue without user context on any error
    req.user = null;
    next();
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
  authenticateTokenEnhanced,
  authenticateOptional,
  requireEmailVerification,
  requireRole,
  logAuthenticatedRequest
};
