/**
 * SuperTokens User Service
 * Centralized service for all user operations using SuperTokens with MongoDB integration
 * Handles user creation, authentication, session management, and data synchronization
 */

const EmailPassword = require('supertokens-node/recipe/emailpassword');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const UserRoles = require('supertokens-node/recipe/userroles');
const EmailVerification = require('supertokens-node/recipe/emailverification');
const Session = require('supertokens-node/recipe/session');
const supertokens = require('supertokens-node');
const User = require('../models/User'); // Enhanced MongoDB model

class SuperTokensUserService {
  
  /**
   * Create a new user with email/password
   */
  static async createUser(userData) {
    const { email, password, firstName, lastName, phone, role = 'admin', status = 'active', useMagicLink = false } = userData;
    
    try {
      // Create user in SuperTokens
      const signUpResponse = await EmailPassword.signUp("public", email, password);
      
      if (signUpResponse.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
        throw new Error('User with this email already exists');
      }
      
      if (signUpResponse.status !== 'OK') {
        throw new Error(`Failed to create user: ${signUpResponse.status}`);
      }
      
      const userId = signUpResponse.user.id;
      
      // Store user metadata in SuperTokens
      const fullName = (firstName && lastName) ? `${firstName.trim()} ${lastName.trim()}`.trim() :
                      firstName ? firstName.trim() :
                      lastName ? lastName.trim() :
                      email;
      
      await UserMetadata.updateUserMetadata(userId, {
        email,
        first_name: firstName || '',
        last_name: lastName || '',
        name: fullName,
        phone: phone || '',
        role: role,
        status: status,
        isEmailVerified: false,
        createdAt: new Date().toISOString()
      });
      
      // Assign role in SuperTokens
      await UserRoles.addRoleToUser("public", userId, role);
      
      // Create minimal record in MongoDB (only for preferences and complex queries)
      await User.createUser(userId);
      
      // Handle email verification
      if (useMagicLink) {
        await this.sendEmailVerificationLink(userId, email);
      } else {
        // SuperTokens will handle OTP through Passwordless recipe
        console.log('Email verification will be handled by SuperTokens Passwordless recipe');
      }
      
      return {
        success: true,
        user: {
          userId,
          email,
          firstName,
          lastName,
          name: fullName,
          role,
          status,
          isEmailVerified: false
        }
      };
      
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Get user by SuperTokens userId
   */
  static async getUserById(userId) {
    try {
      // Get user metadata from SuperTokens
      const metadata = await UserMetadata.getUserMetadata(userId);
      
      // Get user roles
      const rolesResponse = await UserRoles.getRolesForUser("public", userId);
      const roles = rolesResponse.roles || [];
      
      // Get preferences from MongoDB
      const mongoUser = await User.findBySupertokensUserId(userId);
      
      return {
        success: true,
        user: {
          userId,
          email: metadata.metadata.email,
          firstName: metadata.metadata.first_name,
          lastName: metadata.metadata.last_name,
          name: metadata.metadata.name,
          phone: metadata.metadata.phone,
          role: metadata.metadata.role,
          roles: roles,
          status: metadata.metadata.status,
          isEmailVerified: metadata.metadata.isEmailVerified,
          preferences: mongoUser?.preferences || {},
          createdAt: metadata.metadata.createdAt,
          lastLoginAt: mongoUser?.lastLoginAt
        }
      };
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }
  
  /**
   * Update user data
   */
  static async updateUser(userId, updates) {
    try {
      const { firstName, lastName, phone, role, status, preferences } = updates;
      
      // Update SuperTokens metadata
      const metadataUpdates = {};
      if (firstName !== undefined) metadataUpdates.first_name = firstName;
      if (lastName !== undefined) metadataUpdates.last_name = lastName;
      if (phone !== undefined) metadataUpdates.phone = phone;
      if (role !== undefined) metadataUpdates.role = role;
      if (status !== undefined) metadataUpdates.status = status;
      
      // Update full name if firstName or lastName changed
      if (firstName !== undefined || lastName !== undefined) {
        const currentUser = await this.getUserById(userId);
        const newFirstName = firstName !== undefined ? firstName : currentUser.user.firstName;
        const newLastName = lastName !== undefined ? lastName : currentUser.user.lastName;
        const fullName = (newFirstName && newLastName) ? `${newFirstName.trim()} ${newLastName.trim()}`.trim() :
                         newFirstName ? newFirstName.trim() :
                         newLastName ? newLastName.trim() :
                         currentUser.user.email;
        metadataUpdates.name = fullName;
      }
      
      if (Object.keys(metadataUpdates).length > 0) {
        await UserMetadata.updateUserMetadata(userId, metadataUpdates);
      }
      
      // Update role in SuperTokens UserRoles
      if (role !== undefined) {
        // Remove all existing roles
        const currentRoles = await UserRoles.getRolesForUser("public", userId);
        for (const existingRole of currentRoles.roles || []) {
          await UserRoles.removeUserRole("public", userId, existingRole);
        }
        // Add new role
        await UserRoles.addRoleToUser("public", userId, role);
      }
      
      // Update preferences in MongoDB
      if (preferences !== undefined) {
        await User.findOneAndUpdate(
          { supertokensUserId: userId },
          { preferences },
          { upsert: true, new: true }
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Delete user completely
   */
  static async deleteUser(userId) {
    try {
      // Revoke all sessions
      await Session.revokeAllSessionsForUser(userId);
      
      // Remove all roles
      const rolesResponse = await UserRoles.getRolesForUser("public", userId);
      for (const role of rolesResponse.roles || []) {
        await UserRoles.removeUserRole("public", userId, role);
      }
      
      // Delete from SuperTokens
      const deleteResult = await supertokens.deleteUser(userId);
      
      if (deleteResult.status !== "OK") {
        console.warn('⚠️ SuperTokens deletion status:', deleteResult.status);
      }
      
      // Delete from MongoDB
      await User.deleteOne({ supertokensUserId: userId });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }
  
  /**
   * Get all users with pagination and filtering
   */
  static async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 10, role, status, search } = options;
      
      // This is a limitation - SuperTokens doesn't have a built-in way to list all users
      // We'll need to get users from MongoDB and then fetch their SuperTokens data
      const mongoUsers = await User.find({}).sort({ createdAt: -1 });
      
      const users = [];
      for (const mongoUser of mongoUsers) {
        try {
          const userResult = await this.getUserById(mongoUser.supertokensUserId);
          if (userResult.success) {
            const user = userResult.user;
            
            // Apply filters
            if (role && user.role !== role) continue;
            if (status && user.status !== status) continue;
            if (search) {
              const searchLower = search.toLowerCase();
              if (!user.email?.toLowerCase().includes(searchLower) &&
                  !user.name?.toLowerCase().includes(searchLower) &&
                  !user.firstName?.toLowerCase().includes(searchLower) &&
                  !user.lastName?.toLowerCase().includes(searchLower)) {
                continue;
              }
            }
            
            users.push(user);
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch user data for ${mongoUser.supertokensUserId}:`, error.message);
        }
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = users.slice(startIndex, endIndex);
      
      return {
        success: true,
        users: paginatedUsers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(users.length / limit),
          totalUsers: users.length,
          hasNextPage: endIndex < users.length,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }
  
  /**
   * Send email verification link
   */
  static async sendEmailVerificationLink(userId, email) {
    try {
      const recipeUserId = new supertokens.RecipeUserId(userId);
      const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
      
      if (tokenRes.status === "OK") {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${tokenRes.token}`;
        
        const emailService = require('./emailService');
        const emailResult = await emailService.sendMagicLinkEmail(email, email, verificationUrl);
        
        return emailResult;
      } else {
        throw new Error('Failed to create email verification token');
      }
    } catch (error) {
      console.error('❌ Error sending email verification:', error);
      throw error;
    }
  }
  
  /**
   * Verify session and get user data
   */
  static async verifySessionAndGetUser(sessionObj) {
    try {
      const userId = sessionObj.getUserId();
      const sessionHandle = sessionObj.getSessionHandle();
      const accessTokenPayload = sessionObj.getAccessTokenPayload();
      
      const userResult = await this.getUserById(userId);
      
      if (!userResult.success) {
        throw new Error('User not found');
      }
      
      return {
        success: true,
        session: {
          userId,
          sessionHandle,
          isValid: true,
          accessTokenPayload
        },
        user: userResult.user
      };
    } catch (error) {
      console.error('❌ Error verifying session:', error);
      throw error;
    }
  }
}

module.exports = SuperTokensUserService;
