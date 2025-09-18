const User = require('../models/User');
const { requireAdmin, getUserRole } = require('../middleware/roleAuth');

/**
 * Update user role (Admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminUserId = req.session.getUserId();
    
    // Validate role
    const validRoles = ['user', 'admin', 'moderator', 'support'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Find user in database
    const user = await User.findOne({ supertokensUserId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Prevent admin from changing their own role
    if (userId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change own role',
        message: 'Admins cannot change their own role'
      });
    }
    
    // Update user role
    user.role = role;
    await user.save();
    
    console.log(`✅ Admin ${adminUserId} updated user ${userId} role to: ${role}`);
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        userId: user.supertokensUserId,
        email: user.email,
        name: user.name,
        role: user.role,
        updatedBy: adminUserId,
        updatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      message: 'Internal server error'
    });
  }
};

/**
 * Get user profile with role information
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    const userRole = req.session.getAccessTokenPayload().role;
    const userEmail = req.session.getAccessTokenPayload().email;
    const userName = req.session.getAccessTokenPayload().name;
    
    // Get additional user data from database
    const dbUser = await User.findOne({ supertokensUserId: userId });
    
    res.json({
      success: true,
      data: {
        userId: userId,
        email: userEmail,
        name: userName,
        role: userRole,
        isEmailVerified: dbUser?.isEmailVerified || false,
        createdAt: dbUser?.createdAt,
        lastLogin: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: 'Internal server error'
    });
  }
};

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, {
      supertokensUserId: 1,
      email: 1,
      name: 1,
      role: 1,
      isEmailVerified: 1,
      createdAt: 1
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        users: users,
        total: users.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  updateUserRole,
  getUserProfile,
  getAllUsers
};
