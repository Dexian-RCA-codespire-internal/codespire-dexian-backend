/**
 * Email Verification Service
 * Handles email verification status updates across SuperTokens and MongoDB
 */

const UserMetadata = require('supertokens-node/recipe/usermetadata');
const User = require('../models/User');

class EmailVerificationService {
  /**
   * Update email verification status in both SuperTokens metadata and MongoDB
   * @param {string} userId - SuperTokens user ID
   * @param {boolean} isVerified - Verification status
   * @param {string} email - User email (optional, for logging)
   * @returns {Promise<{success: boolean, mongoUpdated: boolean, metadataUpdated: boolean, errors: string[]}>}
   */
  static async updateEmailVerificationStatus(userId, isVerified = true, email = '') {
    const result = {
      success: true,
      mongoUpdated: false,
      metadataUpdated: false,
      errors: []
    };

    try {
      console.log(`📧 Updating email verification status for user ${userId} (${email}): ${isVerified}`);

      // Update MongoDB user
      try {
        const mongoUser = await User.findBySupertokensUserId(userId);
        if (mongoUser) {
          mongoUser.isEmailVerified = isVerified;
          await mongoUser.save();
          result.mongoUpdated = true;
          console.log('✅ MongoDB user email verification status updated');
        } else {
          console.warn('⚠️ MongoDB user not found for SuperTokens userId:', userId);
          result.errors.push('MongoDB user not found');
        }
      } catch (mongoError) {
        console.error('❌ Error updating MongoDB user email verification status:', mongoError);
        result.errors.push(`MongoDB update failed: ${mongoError.message}`);
      }

      // Update SuperTokens metadata
      try {
        const existingMetadata = await UserMetadata.getUserMetadata(userId);
        await UserMetadata.updateUserMetadata(userId, {
          ...existingMetadata.metadata,
          isEmailVerified: isVerified,
          emailVerifiedAt: isVerified ? new Date().toISOString() : null
        });
        result.metadataUpdated = true;
        console.log('✅ SuperTokens metadata updated with email verification status');
      } catch (metadataError) {
        console.error('❌ Error updating SuperTokens metadata:', metadataError);
        result.errors.push(`SuperTokens metadata update failed: ${metadataError.message}`);
      }

      // Determine overall success
      result.success = result.mongoUpdated && result.metadataUpdated;

      if (!result.success) {
        console.warn('⚠️ Email verification status update had issues:', result.errors);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in updateEmailVerificationStatus:', error);
      result.success = false;
      result.errors.push(`General error: ${error.message}`);
      return result;
    }
  }

  /**
   * Get email verification status from both sources
   * @param {string} userId - SuperTokens user ID
   * @returns {Promise<{mongoVerified: boolean, metadataVerified: boolean, consistent: boolean}>}
   */
  static async getEmailVerificationStatus(userId) {
    try {
      // Get MongoDB status
      let mongoVerified = false;
      try {
        const mongoUser = await User.findBySupertokensUserId(userId);
        mongoVerified = mongoUser ? mongoUser.isEmailVerified : false;
      } catch (mongoError) {
        console.error('❌ Error getting MongoDB email verification status:', mongoError);
      }

      // Get SuperTokens metadata status
      let metadataVerified = false;
      try {
        const metadata = await UserMetadata.getUserMetadata(userId);
        metadataVerified = metadata.metadata.isEmailVerified || false;
      } catch (metadataError) {
        console.error('❌ Error getting SuperTokens metadata email verification status:', metadataError);
      }

      return {
        mongoVerified,
        metadataVerified,
        consistent: mongoVerified === metadataVerified
      };

    } catch (error) {
      console.error('❌ Error in getEmailVerificationStatus:', error);
      return {
        mongoVerified: false,
        metadataVerified: false,
        consistent: false
      };
    }
  }

  /**
   * Sync email verification status between MongoDB and SuperTokens metadata
   * @param {string} userId - SuperTokens user ID
   * @param {boolean} preferredStatus - The status to use if there's a conflict
   * @returns {Promise<{success: boolean, synced: boolean, errors: string[]}>}
   */
  static async syncEmailVerificationStatus(userId, preferredStatus = null) {
    try {
      const status = await this.getEmailVerificationStatus(userId);
      
      if (status.consistent) {
        console.log('✅ Email verification status is already consistent');
        return { success: true, synced: true, errors: [] };
      }

      // Determine which status to use
      let targetStatus = preferredStatus;
      if (targetStatus === null) {
        // Use the SuperTokens metadata as the source of truth
        targetStatus = status.metadataVerified;
      }

      console.log(`🔄 Syncing email verification status to: ${targetStatus}`);

      // Update both sources to match
      const updateResult = await this.updateEmailVerificationStatus(userId, targetStatus);
      
      return {
        success: updateResult.success,
        synced: updateResult.success,
        errors: updateResult.errors
      };

    } catch (error) {
      console.error('❌ Error in syncEmailVerificationStatus:', error);
      return {
        success: false,
        synced: false,
        errors: [`Sync failed: ${error.message}`]
      };
    }
  }
}

module.exports = EmailVerificationService;
