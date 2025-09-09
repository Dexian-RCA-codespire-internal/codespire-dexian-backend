const { validationResult } = require('express-validator');
const { createNewSession, getUserId, revokeAllSessionsForUser } = require('supertokens-node/recipe/session');
const { signInUp, getUserById, signIn, signUp } = require('supertokens-node/recipe/emailpassword');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const config = require('../config');
const User = require('../models/User');
const emailService = require('../services/emailService');
const novuService = require('../services/novuService');
const SuperTokensOTPService = require('../services/supertokensOTPService');

// Note: SuperTokens handles user management automatically
// This controller provides additional business logic if needed

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user already exists in our database
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // SuperTokens handles user creation and password hashing
    const response = await signUp('public', email, password);
    
    console.log(response)
    if (response.status === 'OK') {
      try {
        // Create user in our database
        const user = await User.createUser(response.user.id, email, name || email);
        await user.save();
        
        // Send OTP email for verification
        try {
          const otpResult = await SuperTokensOTPService.sendOTP(email);
          if (!otpResult.success) {
            console.error('Failed to send OTP during registration:', otpResult.error);
            // Don't fail registration if OTP fails, but log it
          }
        } catch (otpError) {
          console.error('Error sending OTP during registration:', otpError);
          // Don't fail registration if OTP fails, but log it
        }
        
        // Store additional user metadata in SuperTokens
        if (name) {
          await UserMetadata.updateUserMetadata(response.user.id, { name });
        }
        
        // User created successfully
        res.status(201).json({
          message: 'User registered successfully. Please check your email for verification.',
          user: {
            id: response.user.id,
            email: response.user.email,
            name: name || email,
            isEmailVerified: false
          }
        });
      } catch (dbError) {
        console.error('Database error during registration:', dbError);
        // If database save fails, we should clean up the SuperTokens user
        // For now, we'll just return an error
        res.status(500).json({ error: 'Failed to complete registration' });
      }
    } else {
      // User already exists in SuperTokens
      res.status(400).json({ error: 'User already exists12' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('User already exists')) {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // SuperTokens handles authentication
    const response = await signIn('public', email, password);
    
    if (response.status === 'OK') {
      // Get user from our database
      const user = await User.findBySupertokensUserId(response.user.id);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found in database' });
      }

      // Note: Email verification is optional - users can login without verification
      // We'll use the local database verification status

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({ 
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        });
      }

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();

      // Get user metadata from SuperTokens
      const userMetadata = await UserMetadata.getUserMetadata(response.user.id);
      
      // Login successful
      res.json({
        message: 'Login successful',
        user: {
          id: response.user.id,
          email: response.user.email,
          name: userMetadata.metadata.name || user.name,
          isEmailVerified: user.isEmailVerified,
          role: user.role,
          lastLoginAt: user.lastLoginAt
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    if (error.message.includes('Invalid credentials')) {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    
    // Get user from our database
    const user = await User.findBySupertokensUserId(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user metadata from SuperTokens
    const userMetadata = await UserMetadata.getUserMetadata(userId);

    res.json({
      user: {
        id: user.supertokensUserId,
        email: user.email,
        name: userMetadata.metadata.name || user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, preferences } = req.body;
    const userId = req.session.getUserId();
    
    // Get user from our database
    const user = await User.findBySupertokensUserId(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user data in database
    if (name) {
      user.name = name;
    }
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    await user.save();

    // Update user metadata in SuperTokens
    if (name) {
      await UserMetadata.updateUserMetadata(userId, { name });
    }

    // Get updated user metadata
    const userMetadata = await UserMetadata.getUserMetadata(userId);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.supertokensUserId,
        email: user.email,
        name: userMetadata.metadata.name || user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for email verification using SuperTokens
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use SuperTokens OTP service
    const result = await SuperTokensOTPService.sendOTP(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        preAuthSessionId: result.preAuthSessionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP using SuperTokens
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, deviceId, preAuthSessionId } = req.body;

    if (!email || !otp || !deviceId || !preAuthSessionId) {
      return res.status(400).json({ 
        error: 'Email, OTP, deviceId, and preAuthSessionId are required' 
      });
    }

    // Use SuperTokens OTP service
    const result = await SuperTokensOTPService.verifyOTP(email, otp, deviceId, preAuthSessionId);

    if (result.success) {
      // Send welcome email
      const welcomeEmailResult = await emailService.sendWelcomeEmail(email, result.user.name);
      if (!welcomeEmailResult.success) {
        console.error('Failed to send welcome email:', welcomeEmailResult.error);
        // Don't fail verification if welcome email fails
      }

      res.json({
        success: true,
        message: 'Email verified successfully! You can now log in to your account.',
        user: result.user
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout functionality
const logout = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    
    // Revoke all sessions for the user
    await revokeAllSessionsForUser(userId);
    
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check email verification status using SuperTokens
const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use SuperTokens OTP service
    const result = await SuperTokensOTPService.checkUserVerificationStatus(email);

    if (result.success) {
      res.json({
        email: result.user.email,
        isEmailVerified: result.user.isEmailVerified,
        user: result.user
      });
    } else {
      res.status(404).json({
        error: result.error
      });
    }
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend OTP using SuperTokens
const resendOTP = async (req, res) => {
  try {
    const { email, deviceId, preAuthSessionId } = req.body;

    if (!email || !deviceId || !preAuthSessionId) {
      return res.status(400).json({ 
        error: 'Email, deviceId, and preAuthSessionId are required' 
      });
    }

    // Use SuperTokens OTP service
    const result = await SuperTokensOTPService.resendOTP(email, deviceId, preAuthSessionId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        preAuthSessionId: result.preAuthSessionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send magic link for email verification
const sendMagicLink = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use SuperTokens OTP service for magic link
    const result = await SuperTokensOTPService.sendMagicLink(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        preAuthSessionId: result.preAuthSessionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify magic link
const verifyMagicLink = async (req, res) => {
  try {
    // Handle both POST (with body) and GET (with params) requests
    const linkCode = req.body.linkCode || req.params.token;

    if (!linkCode) {
      return res.status(400).json({ error: 'Link code is required' });
    }

    // Use SuperTokens OTP service for magic link verification
    const result = await SuperTokensOTPService.verifyMagicLink(linkCode);

    if (result.success) {
      // Send welcome email
      const welcomeEmailResult = await emailService.sendWelcomeEmail(result.user.email, result.user.name);
      if (!welcomeEmailResult.success) {
        console.error('Failed to send welcome email:', welcomeEmailResult.error);
        // Don't fail verification if welcome email fails
      }

      // If it's a GET request (direct link click), return HTML page
      if (req.method === 'GET') {
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
              <p><a href="http://localhost:5500/test-auth.html">Go to Login Page</a></p>
            </div>
          </body>
          </html>
        `;
        res.send(html);
      } else {
        // If it's a POST request, return JSON
        res.json({
          success: true,
          message: 'Magic link verified successfully! You can now log in to your account.',
          user: result.user
        });
      }
    } else {
      // If it's a GET request (direct link click), return HTML error page
      if (req.method === 'GET') {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
              .container { max-width: 500px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">❌ Verification Failed</h1>
              <p>${result.error}</p>
              <p><a href="http://localhost:5500/test-auth.html">Go to Login Page</a></p>
            </div>
          </body>
          </html>
        `;
        res.send(html);
      } else {
        // If it's a POST request, return JSON error
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    }
  } catch (error) {
    console.error('Verify magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend magic link
const resendMagicLink = async (req, res) => {
  try {
    const { email, deviceId, preAuthSessionId } = req.body;

    if (!email || !deviceId || !preAuthSessionId) {
      return res.status(400).json({ 
        error: 'Email, deviceId, and preAuthSessionId are required' 
      });
    }

    // Use SuperTokens OTP service for magic link resend
    const result = await SuperTokensOTPService.resendMagicLink(email, deviceId, preAuthSessionId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        preAuthSessionId: result.preAuthSessionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Resend magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send welcome email after registration
const sendWelcomeEmail = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const result = await novuService.sendWelcomeEmail(email, name);

    if (result.success) {
      res.json({
        success: true,
        message: 'Welcome email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send welcome email'
      });
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  sendOTP,
  verifyOTP,
  resendOTP,
  sendMagicLink,
  verifyMagicLink,
  resendMagicLink,
  checkVerificationStatus,
  sendWelcomeEmail
};
