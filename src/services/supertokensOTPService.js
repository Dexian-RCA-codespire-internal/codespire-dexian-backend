const { getUserById, verifyEmailUsingToken } = require('supertokens-node/recipe/emailpassword');
let UserMetadata = null;
try {
  UserMetadata = require('supertokens-node/recipe/usermetadata').UserMetadata;
} catch (error) {
  console.log('UserMetadata recipe not available:', error.message);
}
const User = require('../models/User');
const emailService = require('./emailService');

class SuperTokensOTPService {
  /**
   * Send OTP to email for verification using EmailPassword
   * @param {string} email - User email
   * @returns {Object} Send OTP result
   */
  static async sendOTP(email) {
    try {
      // First, get the user from our local database to get the SuperTokens user ID
      const user = await User.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Note: We'll skip the email verification check since isEmailVerified is not available
      // in the EmailPassword recipe. Users can request verification multiple times.

      // Generate OTP and send using custom email service
      const otp = user.generateOTP();
      await user.save();

      // Send OTP email using custom email service
      const emailResult = await emailService.sendOTPEmail(user.email, user.name, otp);

      if (emailResult.success) {
        return {
          success: true,
          message: 'OTP sent successfully to your email address',
          deviceId: 'custom-otp', // Use a placeholder since we're using custom OTP
          preAuthSessionId: user.supertokensUserId // Use user ID as session identifier
        };
      } else {
        return {
          success: false,
          error: `Failed to send OTP: ${emailResult.error}`
        };
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
    }
  }

  /**
   * Verify OTP code using EmailPassword
   * @param {string} email - User email
   * @param {string} userInputCode - OTP code entered by user
   * @param {string} deviceId - Device ID from sendOTP response (not used in EmailPassword)
   * @param {string} preAuthSessionId - Pre-auth session ID from sendOTP response (user ID)
   * @returns {Object} Verify OTP result
   */
  static async verifyOTP(email, userInputCode, deviceId, preAuthSessionId) {
    try {
      // For EmailPassword, we need to verify using the token from the email
      // Since we can't get the token from the user input, we'll use a different approach
      // We'll check if the email is verified after the user clicks the link in their email
      
      // Get the user from our local database
      const user = await User.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify the OTP code
      if (user.otp !== userInputCode) {
        return {
          success: false,
          error: 'Invalid OTP code'
        };
      }

      // Check if OTP is expired
      if (user.otpExpiry && new Date() > user.otpExpiry) {
        return {
          success: false,
          error: 'OTP code has expired'
        };
      }

      // Get user metadata (with fallback)
      let userMetadata = null;
      if (UserMetadata) {
        try {
          userMetadata = await UserMetadata.getUserMetadata(user.supertokensUserId);
        } catch (error) {
          console.log('UserMetadata not available, using fallback:', error.message);
        }
      } else {
        console.log('UserMetadata recipe not loaded, using fallback');
      }

      // Update local database to mark email as verified and clear OTP
      user.isEmailVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      return {
        success: true,
        message: 'OTP verified successfully',
        user: {
          id: user.supertokensUserId,
          email: user.email,
          name: (userMetadata && userMetadata.metadata && userMetadata.metadata.name) || user.name || user.email,
          isEmailVerified: true
        }
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify OTP'
      };
    }
  }

  /**
   * Resend OTP code using EmailPassword
   * @param {string} email - User email
   * @param {string} deviceId - Device ID from previous sendOTP response (not used in EmailPassword)
   * @param {string} preAuthSessionId - Pre-auth session ID from previous sendOTP response (user ID)
   * @returns {Object} Resend OTP result
   */
  static async resendOTP(email, deviceId, preAuthSessionId) {
    try {
      // Get the user from our local database
      const user = await User.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Note: We'll skip the email verification check since isEmailVerified is not available
      // in the EmailPassword recipe. Users can request verification multiple times.

      // Generate new OTP and send using custom email service
      const otp = user.generateOTP();
      await user.save();

      // Send OTP email using custom email service
      const emailResult = await emailService.sendOTPEmail(user.email, user.name, otp);

      if (emailResult.success) {
        return {
          success: true,
          message: 'OTP resent successfully to your email address',
          deviceId: 'custom-otp',
          preAuthSessionId: user.supertokensUserId
        };
      } else {
        return {
          success: false,
          error: `Failed to resend OTP: ${emailResult.error}`
        };
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend OTP'
      };
    }
  }

  /**
   * Send magic link to email for verification using EmailPassword
   * @param {string} email - User email
   * @returns {Object} Send magic link result
   */
  static async sendMagicLink(email) {
    try {
      // Get the user from our local database
      const user = await User.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Note: We'll skip the email verification check since isEmailVerified is not available
      // in the EmailPassword recipe. Users can request verification multiple times.

      // Generate a magic link token and send using custom email service
      const magicLinkToken = user.generateOTP(); // Using OTP as magic link token
      user.magicLinkToken = magicLinkToken;
      user.magicLinkExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();

      // Create magic link URL pointing to backend verification endpoint
      const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/api/v1/auth/verify-magic-link/${magicLinkToken}`;

      // Send magic link email using custom email service
      const emailResult = await emailService.sendMagicLinkEmail(user.email, user.name, magicLinkUrl);

      if (emailResult.success) {
        return {
          success: true,
          message: 'Magic link sent successfully to your email address',
          deviceId: 'custom-magic-link',
          preAuthSessionId: user.supertokensUserId
        };
      } else {
        return {
          success: false,
          error: `Failed to send magic link: ${emailResult.error}`
        };
      }
    } catch (error) {
      console.error('Send magic link error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send magic link'
      };
    }
  }

  /**
   * Verify magic link code using EmailPassword
   * @param {string} linkCode - Magic link code from URL
   * @returns {Object} Verify magic link result
   */
  static async verifyMagicLink(linkCode) {
    try {
      // Find user by magic link token
      const user = await User.findOne({ magicLinkToken: linkCode });
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid magic link token'
        };
      }

      // Check if magic link is expired
      if (user.magicLinkExpiry && new Date() > user.magicLinkExpiry) {
        return {
          success: false,
          error: 'Magic link has expired'
        };
      }

      // Get user metadata (with fallback)
      let userMetadata = null;
      if (UserMetadata) {
        try {
          userMetadata = await UserMetadata.getUserMetadata(user.supertokensUserId);
        } catch (error) {
          console.log('UserMetadata not available, using fallback:', error.message);
        }
      } else {
        console.log('UserMetadata recipe not loaded, using fallback');
      }

      // Update local database to mark email as verified and clear magic link token
      user.isEmailVerified = true;
      user.magicLinkToken = null;
      user.magicLinkExpiry = null;
      await user.save();

      return {
        success: true,
        message: 'Magic link verified successfully',
        user: {
          id: user.supertokensUserId,
          email: user.email,
          name: (userMetadata && userMetadata.metadata && userMetadata.metadata.name) || user.name || user.email,
          isEmailVerified: true
        }
      };
    } catch (error) {
      console.error('Verify magic link error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify magic link'
      };
    }
  }

  /**
   * Resend magic link using EmailPassword
   * @param {string} email - User email
   * @param {string} deviceId - Device ID from previous sendMagicLink response (not used in EmailPassword)
   * @param {string} preAuthSessionId - Pre-auth session ID from previous sendMagicLink response (user ID)
   * @returns {Object} Resend magic link result
   */
  static async resendMagicLink(email, deviceId, preAuthSessionId) {
    try {
      // Get the user from our local database
      const user = await User.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Note: We'll skip the email verification check since isEmailVerified is not available
      // in the EmailPassword recipe. Users can request verification multiple times.

      // Generate new magic link token and send using custom email service
      const magicLinkToken = user.generateOTP(); // Using OTP as magic link token
      user.magicLinkToken = magicLinkToken;
      user.magicLinkExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();

      // Create magic link URL pointing to backend verification endpoint
      const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/api/v1/auth/verify-magic-link/${magicLinkToken}`;

      // Send magic link email using custom email service
      const emailResult = await emailService.sendMagicLinkEmail(user.email, user.name, magicLinkUrl);

      if (emailResult.success) {
        return {
          success: true,
          message: 'Magic link resent successfully to your email address',
          deviceId: 'custom-magic-link',
          preAuthSessionId: user.supertokensUserId
        };
      } else {
        return {
          success: false,
          error: `Failed to resend magic link: ${emailResult.error}`
        };
      }
    } catch (error) {
      console.error('Resend magic link error:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend magic link'
      };
    }
  }

  /**
   * Check if user exists and get verification status using EmailPassword
   * @param {string} email - User email
   * @returns {Object} User verification status
   */
  static async checkUserVerificationStatus(email) {
    try {
      const user = await getUserByEmail(email);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get user metadata (with fallback)
      let userMetadata = null;
      if (UserMetadata) {
        try {
          userMetadata = await UserMetadata.getUserMetadata(user.supertokensUserId);
        } catch (error) {
          console.log('UserMetadata not available, using fallback:', error.message);
        }
      } else {
        console.log('UserMetadata recipe not loaded, using fallback');
      }

      return {
        success: true,
        user: {
          id: user.supertokensUserId,
          email: user.email,
          name: (userMetadata && userMetadata.metadata && userMetadata.metadata.name) || user.name || user.email,
          isEmailVerified: user.isEmailVerified // Use local database status
        }
      };
    } catch (error) {
      console.error('Check verification status error:', error);
      return {
        success: false,
        error: 'Failed to check verification status'
      };
    }
  }
}

module.exports = SuperTokensOTPService;
