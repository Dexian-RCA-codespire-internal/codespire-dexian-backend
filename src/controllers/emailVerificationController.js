/**
 * Email Verification Controller using SuperTokens
 * Handles both OTP and Magic Link verification
 */

const EmailVerification = require('supertokens-node/recipe/emailverification');
const Passwordless = require('supertokens-node/recipe/passwordless');
const supertokens = require('supertokens-node');
const SuperTokensUserService = require('../services/supertokensUserService');

/**
 * Send Email Verification (Magic Link)
 * Uses SuperTokens EmailVerification recipe
 */
const sendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    console.log('📧 Sending email verification to:', email);
    
    try {
      // Find user by email in SuperTokens
      const users = await supertokens.listUsersByAccountInfo("public", {
        email: email
      });
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'Please sign up first'
        });
      }
      
      const user = users[0];
      
      // Create and send email verification token
      const recipeUserId = new supertokens.RecipeUserId(user.id);
      const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
      
      if (tokenRes.status === "OK") {
        // This will trigger the email delivery service we configured
        await EmailVerification.sendEmailVerificationEmail("public", user.id, email);
      } else {
        throw new Error(`Failed to create verification token: ${tokenRes.status}`);
      }
      
      console.log('✅ Email verification sent successfully');
      
      res.json({
        success: true,
        message: 'Email verification link sent successfully',
        data: {
          email: email,
          method: 'magic_link'
        }
      });
      
    } catch (error) {
      console.error('❌ Error sending email verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send email verification',
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in sendEmailVerification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send OTP for Email Verification
 * Uses SuperTokens Passwordless recipe for OTP
 */
const sendOTPVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    console.log('📧 Sending OTP verification to:', email);
    
    try {
      // Check if user exists
      const users = await supertokens.listUsersByAccountInfo("public", {
        email: email
      });
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'Please sign up first'
        });
      }
      
      // Use Passwordless recipe to send OTP
      const response = await Passwordless.createCode({
        tenantId: "public",
        email: email
      });
      
      if (response.status === "OK") {
        console.log('✅ OTP sent successfully');
        
        res.json({
          success: true,
          message: 'OTP sent successfully to your email',
          data: {
            email: email,
            method: 'otp',
            deviceId: response.deviceId,
            preAuthSessionId: response.preAuthSessionId
          }
        });
      } else {
        console.error('❌ Failed to send OTP:', response.status);
        res.status(400).json({
          success: false,
          error: 'Failed to send OTP',
          message: response.status
        });
      }
      
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send OTP',
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in sendOTPVerification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Verify OTP
 * Uses SuperTokens Passwordless recipe
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, deviceId, preAuthSessionId } = req.body;
    
    if (!email || !otp || !deviceId || !preAuthSessionId) {
      return res.status(400).json({
        success: false,
        error: 'Email, OTP, deviceId, and preAuthSessionId are required'
      });
    }
    
    console.log('🔐 Verifying OTP for:', email);
    
    try {
      // Verify OTP using Passwordless recipe
      const response = await Passwordless.consumeCode({
        tenantId: "public",
        preAuthSessionId: preAuthSessionId,
        deviceId: deviceId,
        userInputCode: otp
      });
      
      if (response.status === "OK") {
        // Mark email as verified in SuperTokens
        const recipeUserId = new supertokens.RecipeUserId(response.user.id);
        await EmailVerification.verifyEmailUsingToken("public", recipeUserId.getAsString(), email);
        
        console.log('✅ OTP verified successfully');
        
        res.json({
          success: true,
          message: 'Email verified successfully',
          data: {
            email: email,
            userId: response.user.id,
            verified: true
          }
        });
      } else {
        console.error('❌ OTP verification failed:', response.status);
        
        let errorMessage = 'Invalid OTP';
        if (response.status === 'EXPIRED_USER_INPUT_CODE_ERROR') {
          errorMessage = 'OTP has expired. Please request a new one.';
        } else if (response.status === 'INCORRECT_USER_INPUT_CODE_ERROR') {
          errorMessage = 'Invalid OTP. Please check and try again.';
        }
        
        res.status(400).json({
          success: false,
          error: 'OTP verification failed',
          message: errorMessage
        });
      }
      
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify OTP',
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in verifyOTP:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Resend Email Verification
 * Allows user to choose between magic link or OTP
 */
const resendVerification = async (req, res) => {
  try {
    const { email, method = 'magic_link' } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    if (method === 'otp') {
      // Redirect to OTP sending
      return sendOTPVerification(req, res);
    } else {
      // Default to magic link
      return sendEmailVerification(req, res);
    }
    
  } catch (error) {
    console.error('❌ Error in resendVerification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Check Email Verification Status
 */
const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    try {
      // Find user by email
      const users = await supertokens.listUsersByAccountInfo("public", {
        email: email
      });
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = users[0];
      
      // Check verification status  
      const recipeUserId = new supertokens.RecipeUserId(user.id);
      const isVerified = await EmailVerification.isEmailVerified(recipeUserId, email);
      
      res.json({
        success: true,
        data: {
          email: email,
          userId: user.id,
          isVerified: isVerified
        }
      });
      
    } catch (error) {
      console.error('❌ Error checking verification status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check verification status',
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in checkVerificationStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  sendEmailVerification,
  sendOTPVerification,
  verifyOTP,
  resendVerification,
  checkVerificationStatus
};
