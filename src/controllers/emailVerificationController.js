/**
 * Email Verification Controller using SuperTokens
 * Handles both OTP and Magic Link verification
 */

const EmailVerification = require('supertokens-node/recipe/emailverification');
const Passwordless = require('supertokens-node/recipe/passwordless');
const supertokens = require('supertokens-node');
const SuperTokensUserService = require('../services/supertokensUserService');
const EmailVerificationService = require('../services/emailVerificationService');

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
      
      // Use Passwordless recipe to create AND send OTP
      console.log('🔧 Creating and sending OTP for email:', email);
      
      // First, create the OTP code
      const response = await Passwordless.createCode({
        tenantId: "public",
        email: email
      });
      
      if (response.status === "OK") {
        console.log('✅ OTP created successfully');
        console.log('📧 OTP Code:', response.userInputCode);
        console.log('📧 Device ID:', response.deviceId);
        console.log('📧 Pre-auth Session ID:', response.preAuthSessionId);
        console.log('📧 Code Lifetime:', response.codeLifetime + 'ms');
        
        // Now actually send the OTP via email using our email service
        console.log('📧 Sending OTP email using our email service...');
        try {
          const emailService = require('../services/emailService');
          const emailResult = await emailService.sendOTPEmail(email, 'User', response.userInputCode);
          
          if (emailResult.success) {
            console.log('✅ OTP email sent successfully via our email service');
            console.log('📬 Message ID:', emailResult.messageId);
          } else {
            console.error('❌ Failed to send OTP email via our service:', emailResult.error);
            // Don't fail the request if email sending fails, OTP is still created
          }
        } catch (emailError) {
          console.error('❌ Error sending OTP email:', emailError.message);
          // Don't fail the request, OTP is still created
        }
        
        // Add additional logging for troubleshooting
        console.log('💡 Email delivery troubleshooting:');
        console.log('   - OTP has been generated and should be sent to:', email);
        console.log('   - Check your email inbox and spam/junk folder');
        console.log('   - Email may take 1-15 minutes to arrive');
        console.log('   - If using Gmail, check "Promotions" and "Spam" tabs');
        
        res.json({
          success: true,
          message: 'OTP sent successfully to your email. Please check your inbox and spam folder.',
          data: {
            email: email,
            method: 'otp',
            deviceId: response.deviceId,
            preAuthSessionId: response.preAuthSessionId,
            codeLifetime: response.codeLifetime,
            deliveryTips: [
              'Check spam/junk folder',
              'Email may take 1-15 minutes to arrive',
              'Check Gmail Promotions tab if using Gmail',
              'Ensure the sender email is not blocked'
            ]
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
        
        // Update email verification status in both MongoDB and SuperTokens metadata
        const updateResult = await EmailVerificationService.updateEmailVerificationStatus(
          response.user.id, 
          true, 
          email
        );
        
        if (!updateResult.success) {
          console.warn('⚠️ Email verification status update had issues:', updateResult.errors);
        }
        
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


/**
 * Send OTP directly using email service (bypassing SuperTokens)
 */
const sendDirectOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    console.log('📧 Sending direct OTP to:', email);
    
    // Generate random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Import email service
    const emailService = require('../services/emailService');
    
    // Send OTP directly
    const result = await emailService.sendOTPEmail(email, 'User', otp);
    
    if (result.success) {
      // Store OTP in memory/cache for verification (in production, use Redis)
      // For now, just log it for testing
      console.log('🔢 Generated OTP for testing:', otp);
      
      res.json({
        success: true,
        message: 'OTP sent directly via email service! Please check your email.',
        data: {
          email: email,
          messageId: result.messageId,
          // Include OTP in response for testing (remove in production)
          testOTP: process.env.NODE_ENV === 'development' ? otp : undefined,
          deliveryTips: [
            'Check your email inbox',
            'Check spam/junk folder',
            'Email may take 1-15 minutes to arrive',
            'OTP expires in 10 minutes'
          ]
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send direct OTP',
        message: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error in sendDirectOTP:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Sync email verification status between MongoDB and SuperTokens metadata
 */
const syncEmailVerificationStatus = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    console.log('🔄 Syncing email verification status for:', email);
    
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
      
      // Get current status
      const currentStatus = await EmailVerificationService.getEmailVerificationStatus(user.id);
      
      // Sync the status
      const syncResult = await EmailVerificationService.syncEmailVerificationStatus(user.id);
      
      console.log('✅ Email verification status sync completed');
      
      res.json({
        success: true,
        message: 'Email verification status synced successfully',
        data: {
          email: email,
          userId: user.id,
          previousStatus: currentStatus,
          syncResult: syncResult
        }
      });
      
    } catch (error) {
      console.error('❌ Error syncing email verification status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync email verification status',
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in syncEmailVerificationStatus:', error);
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
  checkVerificationStatus,
  sendDirectOTP,
  syncEmailVerificationStatus,
 
};
