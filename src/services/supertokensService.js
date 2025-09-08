const { signIn, signUp, getUserById } = require('supertokens-node/recipe/emailpassword');
const { UserMetadata } = require('supertokens-node/recipe/usermetadata');
const { revokeAllSessionsForUser } = require('supertokens-node/recipe/session');

class SuperTokensService {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} name - User name (optional)
   * @returns {Object} Registration result
   */
  static async registerUser(email, password, name = null) {
    try {
      const response = await signUp('public', email, password);
      
      if (response.status === 'OK') {
        // Store additional user metadata
        if (name) {
          await UserMetadata.updateUserMetadata(response.user.id, { name });
        }
        
        return {
          success: true,
          user: {
            id: response.user.id,
            email: response.user.email,
            name: name || email
          }
        };
      } else {
        return {
          success: false,
          error: 'User already exists'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message.includes('User already exists') ? 'User already exists' : 'Registration failed'
      };
    }
  }

  /**
   * Sign in a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} Sign in result
   */
  static async signInUser(email, password) {
    try {
      const response = await signIn('public', email, password);
      
      if (response.status === 'OK') {
        // Get user metadata
        const userMetadata = await UserMetadata.getUserMetadata(response.user.id);
        
        return {
          success: true,
          user: {
            id: response.user.id,
            email: response.user.email,
            name: userMetadata.metadata.name || email
          }
        };
      } else {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message.includes('Invalid credentials') ? 'Invalid credentials' : 'Sign in failed'
      };
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Object} User profile
   */
  static async getUserProfile(userId) {
    try {
      const user = await getUserById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get user metadata
      const userMetadata = await UserMetadata.getUserMetadata(userId);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: userMetadata.metadata.name || user.email,
          createdAt: user.timeJoined
        }
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: 'Failed to get user profile'
      };
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Object} Update result
   */
  static async updateUserProfile(userId, updates) {
    try {
      // Update user metadata
      await UserMetadata.updateUserMetadata(userId, updates);

      // Get updated user info
      const user = await getUserById(userId);
      const userMetadata = await UserMetadata.getUserMetadata(userId);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: userMetadata.metadata.name || user.email
        }
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: 'Failed to update profile'
      };
    }
  }

  /**
   * Logout user (revoke all sessions)
   * @param {string} userId - User ID
   * @returns {Object} Logout result
   */
  static async logoutUser(userId) {
    try {
      await revokeAllSessionsForUser(userId);
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Failed to logout'
      };
    }
  }

  /**
   * Check if user exists
   * @param {string} email - User email
   * @returns {boolean} User exists
   */
  static async userExists(email) {
    try {
      const user = await getUserById(email);
      return !!user;
    } catch (error) {
      return false;
    }
  }
}

module.exports = SuperTokensService;
