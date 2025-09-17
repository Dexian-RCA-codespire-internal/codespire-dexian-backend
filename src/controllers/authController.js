const { validationResult } = require('express-validator');
const { createNewSession, getUserId, revokeAllSessionsForUser } = require('supertokens-node/recipe/session');
const { signInUp, getUserById, signIn, signUp } = require('supertokens-node/recipe/emailpassword');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const supertokens = require('supertokens-node');
const logger = require('../utils/logger');
const config = require('../config');
const User = require('../models/User');
const emailService = require('../services/emailService');
const SuperTokensOTPService = require('../services/supertokensOTPService');

// Note: SuperTokens handles user management automatically
// This controller provides additional business logic if needed

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, firstName, lastName, phone } = req.body;
    
    // Generate name from firstName and lastName if name is not provided or empty
    const fullName = name && name.trim() ? name.trim() : 
                    (firstName && lastName) ? `${firstName.trim()} ${lastName.trim()}`.trim() :
                    firstName ? firstName.trim() :
                    lastName ? lastName.trim() :
                    email; // fallback to email if no name provided

    // Check if user already exists in our database
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // SuperTokens handles user creation and password hashing
    const response = await signUp('public', email, password);
    
    logger.info(response)
    if (response.status === 'OK') {
      try {
        // Create user in our database
        const user = await User.createUser(
          response.user.id, 
          email, 
          fullName, 
          firstName, 
          lastName, 
          phone
        );
        
        // Send OTP email for verification
        let otpData = null;
        try {
          const otpResult = await SuperTokensOTPService.sendOTP(email);
          if (otpResult.success) {
            otpData = {
              deviceId: otpResult.deviceId,
              preAuthSessionId: otpResult.preAuthSessionId
            };
          } else {
            console.error('Failed to send OTP during registration:', otpResult.error);
            // Don't fail registration if OTP fails, but log it
          }
        } catch (otpError) {
          console.error('Error sending OTP during registration:', otpError);
          // Don't fail registration if OTP fails, but log it
        }
        
        // Store additional user metadata in SuperTokens
        const userMetadata = { name: fullName };
        if (firstName) userMetadata.firstName = firstName;
        if (lastName) userMetadata.lastName = lastName;
        if (phone) userMetadata.phone = phone;
        
        await UserMetadata.updateUserMetadata(response.user.id, userMetadata);
        
        // User created successfully
        res.status(201).json({
          message: 'User registered successfully. Please check your email for verification.',
          user: {
            id: response.user.id,
            email: response.user.email,
            name: fullName,
            firstName: firstName || null,
            lastName: lastName || null,
            phone: phone || null,
            isEmailVerified: false
          },
          otpData: otpData // Include OTP data for frontend verification
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
        firstName: user.firstName || userMetadata.metadata.firstName || null,
        lastName: user.lastName || userMetadata.metadata.lastName || null,
        phone: user.phone || userMetadata.metadata.phone || null,
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

    const { name, firstName, lastName, phone, preferences } = req.body;
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
    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
    }
    if (phone !== undefined) {
      user.phone = phone;
    }
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    await user.save();

    // Update user metadata in SuperTokens
    const userMetadata = {};
    if (name) userMetadata.name = name;
    if (firstName !== undefined) userMetadata.firstName = firstName;
    if (lastName !== undefined) userMetadata.lastName = lastName;
    if (phone !== undefined) userMetadata.phone = phone;
    
    if (Object.keys(userMetadata).length > 0) {
      await UserMetadata.updateUserMetadata(userId, userMetadata);
    }

    // Get updated user metadata
    const updatedUserMetadata = await UserMetadata.getUserMetadata(userId);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.supertokensUserId,
        email: user.email,
        name: updatedUserMetadata.metadata.name || user.name,
        firstName: user.firstName || updatedUserMetadata.metadata.firstName || null,
        lastName: user.lastName || updatedUserMetadata.metadata.lastName || null,
        phone: user.phone || updatedUserMetadata.metadata.phone || null,
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

    if (!email || !otp) {
      return res.status(400).json({ 
        error: 'Email and OTP are required' 
      });
    }

    // Use provided deviceId and preAuthSessionId, or use fallback values
    const finalDeviceId = deviceId || 'direct-verification';
    const finalPreAuthSessionId = preAuthSessionId || 'direct-verification';

    // Use SuperTokens OTP service
    const result = await SuperTokensOTPService.verifyOTP(email, otp, finalDeviceId, finalPreAuthSessionId);

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
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/test-auth.html">Go to Login Page</a></p>
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
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/test-auth.html">Go to Login Page</a></p>
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

    // Welcome email functionality removed (Novu service removed)
    res.json({
      success: true,
      message: 'Welcome email functionality has been removed'
    });
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate email verification token using SuperTokens
const generateEmailVerificationToken = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.session.getUserId();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create verification token using SuperTokens
    const recipeUserId = new supertokens.RecipeUserId(userId);
    const tokenRes = await EmailVerification.createEmailVerificationToken(
      "public",
      recipeUserId,
      email
    );

    if (tokenRes.status === "OK") {
      res.json({
        success: true,
        message: 'Email verification token generated successfully',
        token: tokenRes.token
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to generate verification token'
      });
    }
  } catch (error) {
    console.error('Generate email verification token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify email using SuperTokens token
const verifyEmailToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify email using SuperTokens
    const verifyRes = await EmailVerification.verifyEmailUsingToken("public", token);

    if (verifyRes.status === "OK") {
      // Update local database
      const user = await User.findBySupertokensUserId(verifyRes.user.id);
      if (user) {
        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
        await user.save();
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: verifyRes.user.id,
          email: verifyRes.user.email,
          isEmailVerified: true
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }
  } catch (error) {
    console.error('Verify email token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify custom OTP with token
const verifyCustomOTP = async (req, res) => {
  try {
    const { token, otp } = req.body;
    const userId = req.session.getUserId();

    if (!token || !otp) {
      return res.status(400).json({ 
        error: 'Token and OTP are required' 
      });
    }

    // Get user from database
    const user = await User.findBySupertokensUserId(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the OTP using SuperTokensOTPService
    const result = await SuperTokensOTPService.verifyOTP(
      user.email, 
      otp, 
      'direct-verification', // deviceId
      'direct-verification'  // preAuthSessionId
    );

    if (result.success) {
      // Mark email as verified in SuperTokens and local DB
      try {
        // Flip the SuperTokens flag using manual verification
        const recipeUserId = new supertokens.RecipeUserId(user.supertokensUserId);
        const tokenRes = await EmailVerification.createEmailVerificationToken(
          "public",
          recipeUserId,
          user.email
        );
        if (tokenRes.status === "OK") {
          await EmailVerification.verifyEmailUsingToken("public", tokenRes.token);
          logger.info('✅ Email marked as verified in SuperTokens (custom OTP)');
        }
      } catch (e) {
        console.error("Failed to mark verified in SuperTokens (custom OTP):", e);
      }

      // Update local database
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
      logger.info('✅ Email marked as verified in local DB (custom OTP)');

      // Send welcome email
      const welcomeEmailResult = await emailService.sendWelcomeEmail(user.email, user.name);
      if (!welcomeEmailResult.success) {
        console.error('Failed to send welcome email:', welcomeEmailResult.error);
      }

      res.json({
        success: true,
        message: 'OTP verified successfully! Email is now verified.',
        user: {
          id: user.supertokensUserId,
          email: user.email,
          name: user.name,
          isEmailVerified: true
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Invalid OTP'
      });
    }
  } catch (error) {
    console.error('Verify custom OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot Password - Generate SuperTokens reset token and send email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found with this email address' 
      });
    }

    logger.info('User found:', {
      email: user.email,
      supertokensUserId: user.supertokensUserId,
      userIdType: typeof user.supertokensUserId
    });

    // Generate a custom reset token and store it in the user document
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store the reset token in the user document
    user.passwordResetToken = {
      token: resetToken,
      expiresAt: expiresAt
    };
    await user.save();
    
    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    
    // Send reset email with the link using our custom email service
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email, 
      user.name || 'User', 
      resetLink
    );
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Password reset link sent successfully. Please check your email.',
        email: user.email
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send reset email',
        details: emailResult.error
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Reset Password using custom token
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Find user by reset token
    const user = await User.findOne({ 
      'passwordResetToken.token': token,
      'passwordResetToken.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Reset password using SuperTokens v19 API
    const supertokens = require('supertokens-node');
    const EmailPassword = require('supertokens-node/recipe/emailpassword').default;
    
    try {
      logger.info('Attempting to reset password for user:', user.supertokensUserId);
      
      // Get the user from SuperTokens to find the email-password recipe user id
      const u = await supertokens.getUser(user.supertokensUserId);
      if (!u) {
        return res.status(400).json({
          success: false,
          error: 'User not found in SuperTokens'
        });
      }
      
      // Find the email-password login method for the 'public' tenant
      const epLogin = u.loginMethods.find(
        (lm) => lm.recipeId === 'emailpassword' && lm.tenantIds.includes('public')
      );
      
      if (!epLogin) {
        return res.status(400).json({
          success: false,
          error: 'User has no email/password login for tenant \'public\''
        });
      }
      
      logger.info('Found EP login method:', {
        recipeId: epLogin.recipeId,
        tenantIds: epLogin.tenantIds,
        recipeUserId: epLogin.recipeUserId.getAsString()
      });
      
      // Update password using the correct recipeUserId
      const updateResult = await EmailPassword.updateEmailOrPassword({
        recipeUserId: epLogin.recipeUserId,
        password: newPassword,
        tenantIdForPasswordPolicy: 'public'
      });
      
      logger.info('Password update result:', updateResult);
      
      if (updateResult.status === 'OK') {
        // Clear the reset token after successful password reset
        user.passwordResetToken = undefined;
        await user.save();
        
        res.json({
          success: true,
          message: 'Password reset successfully. You can now log in with your new password.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to update password',
          details: updateResult.status
        });
      }
    } catch (updateError) {
      console.error('Password update error:', updateError);
      res.status(400).json({
        success: false,
        error: 'Failed to update password',
        details: updateError.message
      });
    }
  } catch (error) {
    console.error('Reset password with token error:', error);
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
  sendWelcomeEmail,
  generateEmailVerificationToken,
  verifyEmailToken,
  verifyCustomOTP,
  forgotPassword,
  resetPasswordWithToken
};


