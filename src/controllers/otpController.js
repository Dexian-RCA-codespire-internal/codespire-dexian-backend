const { Passwordless } = require('supertokens-node/recipe/passwordless');
const { EmailVerification } = require('supertokens-node/recipe/emailverification');
const { EmailPassword } = require('supertokens-node/recipe/emailpassword');
const { supertokens } = require('supertokens-node');
const emailService = require('../services/emailService');
const User = require('../models/User');

class OTPController {
  // Send OTP to email (for EmailPassword users)
  async sendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('📧 Sending OTP to EmailPassword user:', email);

      // Find user in our database by email
      const dbUser = await User.findByEmail(email);
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please sign up first.'
        });
      }

      // Check if user is already verified
      if (dbUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Generate and send OTP
      const otpResult = await dbUser.sendOTPEmail();
      if (otpResult.success) {
        console.log('✅ OTP sent successfully to EmailPassword user:', email);
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully to your email address',
          userId: dbUser.supertokensUserId
        });
      } else {
        console.error('❌ Failed to send OTP:', otpResult.error);
        return res.status(400).json({
          success: false,
          error: 'Failed to send OTP'
        });
      }
    } catch (error) {
      console.error('❌ Error in sendOTP:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Verify OTP (for EmailPassword users)
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email and OTP are required'
        });
      }

      console.log('🔐 Verifying OTP for EmailPassword user:', email);

      // Find user in our database by email
      const dbUser = await User.findByEmail(email);
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please sign up first.'
        });
      }

      // Check if user is already verified
      if (dbUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Verify OTP
      const isValidOTP = dbUser.verifyOTP(otp);
      if (!isValidOTP) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP code'
        });
      }

      // Mark email as verified in our database
      dbUser.markEmailVerified();
      await dbUser.save();

      // Also mark email as verified in SuperTokens
      try {
        const EmailVerification = require('supertokens-node/recipe/emailverification');
        const supertokens = require('supertokens-node');
        console.log('🔍 Attempting to verify email in SuperTokens for user:', dbUser.supertokensUserId, email);
        
        // Create RecipeUserId object properly
        const recipeUserId = new supertokens.RecipeUserId(dbUser.supertokensUserId);
        console.log('🔍 Created RecipeUserId:', recipeUserId);
        
        // Try token-based verification (the correct approach)
        const tokenResult = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
        console.log('🔍 Token creation result:', tokenResult);
        
        if (tokenResult.status === "OK") {
          const verifyResult = await EmailVerification.verifyEmailUsingToken("public", tokenResult.token);
          console.log('🔍 Email verification result:', verifyResult);
          
          if (verifyResult.status === "OK") {
            console.log('✅ Email marked as verified in SuperTokens for user:', email);
            console.log('✅ SuperTokens verification result:', verifyResult);
          } else {
            console.log('⚠️ Failed to verify email with token:', verifyResult);
          }
        } else {
          console.log('⚠️ Failed to create verification token:', tokenResult);
        }
      } catch (superTokensError) {
        console.log('⚠️ Error updating SuperTokens email verification status:', superTokensError.message);
        console.log('⚠️ Full error details:', superTokensError);
        // Don't fail the request if SuperTokens update fails, but log it
      }

      console.log('✅ OTP verified successfully for EmailPassword user:', email);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now log in to your account.',
        user: {
          id: dbUser.supertokensUserId,
          email: dbUser.email,
          isEmailVerified: true
        }
      });
    } catch (error) {
      console.error('❌ Error in verifyOTP:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Resend OTP (for EmailPassword users)
  async resendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('📧 Resending OTP to EmailPassword user:', email);

      // Find user in our database by email
      const dbUser = await User.findByEmail(email);
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please sign up first.'
        });
      }

      // Check if user is already verified
      if (dbUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Generate and send new OTP
      const otpResult = await dbUser.sendOTPEmail();
      if (otpResult.success) {
        console.log('✅ OTP resent successfully to EmailPassword user:', email);
        return res.status(200).json({
          success: true,
          message: 'OTP resent successfully to your email address',
          userId: dbUser.supertokensUserId
        });
      } else {
        console.error('❌ Failed to resend OTP:', otpResult.error);
        return res.status(400).json({
          success: false,
          error: 'Failed to resend OTP'
        });
      }
    } catch (error) {
      console.error('❌ Error in resendOTP:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Send Magic Link (for EmailPassword users)
  async sendMagicLink(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('📧 Sending Magic Link to EmailPassword user:', email);

      // Find user in our database by email
      const dbUser = await User.findByEmail(email);
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please sign up first.'
        });
      }

      // Check if user is already verified
      if (dbUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Create email verification token for magic link
      const EmailVerification = require('supertokens-node/recipe/emailverification');
      const supertokens = require('supertokens-node');
      const recipeUserId = new supertokens.RecipeUserId(dbUser.supertokensUserId);
      const tokenResult = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
      if (tokenResult.status === "OK") {
        const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/verify-email?token=${tokenResult.token}`;
        
        // Send magic link email
        const emailResult = await emailService.sendMagicLinkEmail(email, email, magicLinkUrl);
        if (emailResult.success) {
          console.log('✅ Magic link sent successfully to EmailPassword user:', email);
          return res.status(200).json({
            success: true,
            message: 'Magic link sent successfully to your email address',
            userId: dbUser.supertokensUserId
          });
        } else {
          console.error('❌ Failed to send magic link email:', emailResult.error);
          return res.status(400).json({
            success: false,
            error: 'Failed to send magic link email'
          });
        }
      } else {
        console.error('❌ Failed to create magic link token:', tokenResult);
        return res.status(400).json({
          success: false,
          error: 'Failed to create magic link'
        });
      }
    } catch (error) {
      console.error('❌ Error in sendMagicLink:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Verify Magic Link (for EmailPassword users)
  async verifyMagicLink(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required'
        });
      }

      console.log('🔐 Verifying Magic Link for EmailPassword user');

      // Verify the magic link token
      const result = await EmailVerification.verifyEmailUsingToken("public", token);
      
      if (result.status === "OK") {
        console.log('✅ Magic link verified successfully for EmailPassword user');
        
        // Find user in our database and mark as verified
        const dbUser = await User.findBySupertokensUserId(result.userId);
        if (dbUser) {
          dbUser.markEmailVerified();
          await dbUser.save();
        }

        return res.status(200).json({
          success: true,
          message: 'Magic link verified successfully! You can now log in to your account.',
          user: {
            id: result.userId,
            email: result.email,
            isEmailVerified: true
          }
        });
      } else {
        console.error('❌ Magic link verification failed:', result);
        return res.status(400).json({
          success: false,
          error: 'Magic link verification failed'
        });
      }
    } catch (error) {
      console.error('❌ Error in verifyMagicLink:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Resend Magic Link (for EmailPassword users)
  async resendMagicLink(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('📧 Resending Magic Link to EmailPassword user:', email);

      // Find user in our database by email
      const dbUser = await User.findByEmail(email);
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please sign up first.'
        });
      }

      // Check if user is already verified
      if (dbUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Create new email verification token for magic link
      const EmailVerification = require('supertokens-node/recipe/emailverification');
      const supertokens = require('supertokens-node');
      const recipeUserId = new supertokens.RecipeUserId(dbUser.supertokensUserId);
      const tokenResult = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
      if (tokenResult.status === "OK") {
        const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/verify-email?token=${tokenResult.token}`;
        
        // Send magic link email
        const emailResult = await emailService.sendMagicLinkEmail(email, email, magicLinkUrl);
        if (emailResult.success) {
          console.log('✅ Magic link resent successfully to EmailPassword user:', email);
          return res.status(200).json({
            success: true,
            message: 'Magic link resent successfully to your email address',
            userId: dbUser.supertokensUserId
          });
        } else {
          console.error('❌ Failed to resend magic link email:', emailResult.error);
          return res.status(400).json({
            success: false,
            error: 'Failed to resend magic link email'
          });
        }
      } else {
        console.error('❌ Failed to create magic link token:', tokenResult);
        return res.status(400).json({
          success: false,
          error: 'Failed to create magic link'
        });
      }
    } catch (error) {
      console.error('❌ Error in resendMagicLink:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Check verification status (for EmailPassword users)
  async checkVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('🔍 Checking verification status for EmailPassword user:', email);

      // Find user in our database by email
      const dbUser = await User.findByEmail(email);

      if (dbUser) {
        return res.status(200).json({
          email: email,
          isEmailVerified: dbUser.isEmailVerified,
          user: {
            id: dbUser.supertokensUserId,
            email: dbUser.email,
            isEmailVerified: dbUser.isEmailVerified
          }
        });
      } else {
        return res.status(200).json({
          email: email,
          isEmailVerified: false,
          user: null
        });
      }
    } catch (error) {
      console.error('❌ Error in checkVerification:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new OTPController();
