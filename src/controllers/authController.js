const { validationResult } = require('express-validator');
const { createNewSession, getUserId, revokeAllSessionsForUser } = require('supertokens-node/recipe/session');
const { signInUp, getUserById, signIn, signUp } = require('supertokens-node/recipe/emailpassword');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const config = require('../config');
const User = require('../models/User');
const emailService = require('../services/emailService');
const novuService = require('../services/novuService');

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
        
        // Generate OTP for email verification
        const otp = user.generateOTP();
        await user.save();
        
        // Send OTP email
        const emailResult = await emailService.sendOTPEmail(email, name || email, otp);
        
        if (!emailResult.success) {
          console.error('Failed to send OTP email:', emailResult.error);
          // Don't fail registration if email fails, but log it
        }
        
        // Store additional user metadata in SuperTokens
        if (name) {
          await UserMetadata.updateUserMetadata(response.user.id, { name });
        }
        
        // User created successfully
        res.status(201).json({
          message: 'User registered successfully. Please check your email for verification code.',
          user: {
            id: response.user.id,
            email: response.user.email,
            name: name || email,
            isEmailVerified: false
          },
          emailSent: emailResult.success
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

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          error: 'Email not verified',
          message: 'Please verify your email address before logging in',
          requiresVerification: true
        });
      }

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

// Send OTP for email verification
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();
    
    // Send OTP via email
    const emailResult = await emailService.sendOTPEmail(email, user.name, otp);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'OTP sent successfully to your email address'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send OTP email'
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Verify OTP
    const isValidOTP = user.verifyOTP(otp);
    if (!isValidOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark email as verified
    user.markEmailVerified();
    await user.save();

    // Send welcome email
    const welcomeEmailResult = await emailService.sendWelcomeEmail(email, user.name);
    if (!welcomeEmailResult.success) {
      console.error('Failed to send welcome email:', welcomeEmailResult.error);
      // Don't fail verification if welcome email fails
    }
    
    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user.supertokensUserId,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified
      }
    });
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

// Check email verification status
const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      status: user.status
    });
  } catch (error) {
    console.error('Check verification status error:', error);
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
  checkVerificationStatus,
  sendWelcomeEmail
};
