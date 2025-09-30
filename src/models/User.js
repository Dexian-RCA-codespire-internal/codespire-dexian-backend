const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  supertokensUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  roles: [{
    type: String,
    enum: ['user', 'admin'],
    default: ['user']
  }],
  permissions: [{
    type: String
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    code: String,
    expiresAt: Date
  },
  passwordResetOTP: {
    code: String,
    expiresAt: Date
  },
  passwordResetToken: {
    token: String,
    expiresAt: Date
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  magicLinkToken: {
    type: String
  },
  magicLinkExpiry: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },
  profilePicture: {
    type: String
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ supertokensUserId: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ roles: 1 });
userSchema.index({ permissions: 1 });

// Instance methods
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.emailVerificationOTP;
  return user;
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const config = require('../config');
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
  
  this.emailVerificationOTP = {
    code: otp,
    expiresAt: expiresAt
  };
  
  // Also set the otp field for SuperTokensOTPService compatibility
  this.otp = otp;
  this.otpExpiry = expiresAt;
  
  return otp;
};

userSchema.methods.verifyOTP = function(otp) {
  // Check both emailVerificationOTP and otp fields for compatibility
  const otpCode = this.emailVerificationOTP?.code || this.otp;
  const otpExpiry = this.emailVerificationOTP?.expiresAt || this.otpExpiry;
  
  if (!otpCode) {
    return false;
  }
  
  if (otpExpiry && new Date() > otpExpiry) {
    return false;
  }
  
  return otpCode === otp;
};

userSchema.methods.markEmailVerified = function() {
  this.isEmailVerified = true;
  this.emailVerificationOTP = undefined;
  this.otp = undefined;
  this.otpExpiry = undefined;
  this.magicLinkToken = undefined;
  this.magicLinkExpiry = undefined;
};

// RBAC methods
userSchema.methods.syncRolesFromSuperTokens = async function() {
  try {
    const UserRoles = require('supertokens-node/recipe/userroles');
    const roles = await UserRoles.getRolesForUser(this.supertokensUserId);
    
    this.roles = roles.roles || [];
    
    await this.save();
    return { success: true, roles: this.roles };
  } catch (error) {
    console.error('Error syncing roles from SuperTokens:', error);
    return { success: false, error: error.message };
  }
};

userSchema.methods.syncPermissionsFromSuperTokens = async function() {
  try {
    const UserRoles = require('supertokens-node/recipe/userroles');
    
    // Get user roles first
    const userRoles = await UserRoles.getRolesForUser(this.supertokensUserId);
    const allPermissions = [];
    
    // Get permissions for each role
    for (const role of userRoles.roles) {
      const rolePermissions = await UserRoles.getPermissionsForRole(role);
      if (rolePermissions.status !== "UNKNOWN_ROLE_ERROR") {
        allPermissions.push(...rolePermissions.permissions);
      }
    }
    
    // Remove duplicates and save
    this.permissions = [...new Set(allPermissions)];
    await this.save();
    return { success: true, permissions: this.permissions };
  } catch (error) {
    console.error('Error syncing permissions from SuperTokens:', error);
    return { success: false, error: error.message };
  }
};

userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

userSchema.methods.hasAnyRole = function(roles) {
  return roles.some(role => this.hasRole(role));
};

userSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(permission => this.hasPermission(permission));
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findBySupertokensUserId = function(supertokensUserId) {
  return this.findOne({ supertokensUserId });
};

userSchema.statics.createUser = async function(supertokensUserId, email, name, firstName = null, lastName = null, phone = null) {
  console.log('User.createUser called with:', {
    supertokensUserId,
    email: email.toLowerCase(),
    name,
    firstName,
    lastName,
    phone
  });
  
  const user = new this({
    supertokensUserId,
    email: email.toLowerCase(),
    name,
    firstName,
    lastName,
    phone
  });
  
  console.log('User document created:', user);
  
  const savedUser = await user.save();
  console.log('User saved successfully:', savedUser._id);
  
  return savedUser;
};

userSchema.statics.findByRole = function(role) {
  return this.find({ roles: role });
};

userSchema.statics.findByRoles = function(roles) {
  return this.find({ roles: { $in: roles } });
};

userSchema.statics.findByPermission = function(permission) {
  return this.find({ permissions: permission });
};

userSchema.statics.findByPermissions = function(permissions) {
  return this.find({ permissions: { $in: permissions } });
};

userSchema.statics.findUsersWithRole = function(role) {
  return this.find({ roles: role });
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
