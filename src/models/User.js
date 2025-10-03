const mongoose = require('mongoose');

// Enhanced User model - stores essential data in MongoDB while leveraging SuperTokens for auth
const userSchema = new mongoose.Schema({
  supertokensUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Store email for quick queries (also in SuperTokens)
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  // User profile information
  name: {
    type: String,
    default: ''
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['user', 'admin', 'moderator', 'support']
  },
  roles: [{
    type: String,
    enum: ['user', 'admin', 'moderator', 'support']
  }],
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'suspended']
  },
  // Authentication and session tracking
  lastLoginAt: {
    type: Date
  },
  lastLogoutAt: {
    type: Date
  },
  sessionCount: {
    type: Number,
    default: 0
  },
  activeSessions: [{
    sessionHandle: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    userAgent: String,
    ipAddress: String,
    deviceInfo: {
      type: String,
      default: 'Unknown'
    }
  }],
  // User status for business logic
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Keep preferences in MongoDB for complex queries
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
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  // Audit fields
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ supertokensUserId: 1 });
userSchema.index({ createdAt: -1 });

// Instance methods
userSchema.methods.toJSON = function() {
  return this.toObject();
};

// Static methods to work with SuperTokens
userSchema.statics.findBySupertokensUserId = function(supertokensUserId) {
  return this.findOne({ supertokensUserId, deletedAt: null });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), deletedAt: null });
};

userSchema.statics.createUser = async function(supertokensUserId, email, userData = {}) {
  const { preferences = {}, ...otherData } = userData;
  
  return this.create({
    supertokensUserId,
    email: email.toLowerCase(),
    name: otherData.name || '',
    firstName: otherData.firstName || '',
    lastName: otherData.lastName || '',
    phone: otherData.phone || '',
    role: otherData.role || 'admin',
    roles: otherData.roles || ['admin'],
    status: otherData.status || 'active',
    isActive: otherData.isActive !== false,
    isEmailVerified: otherData.isEmailVerified || false,
    preferences: {
      theme: preferences.theme || 'light',
      notifications: {
        email: preferences.notifications?.email !== false,
        push: preferences.notifications?.push !== false
      },
      language: preferences.language || 'en'
    },
    lastLoginAt: new Date()
  });
};

// Instance methods
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  this.sessionCount = (this.sessionCount || 0) + 1;
  return this.save();
};

userSchema.methods.addActiveSession = function(sessionData) {
  const { sessionHandle, userAgent, ipAddress, deviceInfo } = sessionData;
  
  // Remove any existing session with the same handle
  this.activeSessions = this.activeSessions.filter(
    session => session.sessionHandle !== sessionHandle
  );
  
  // Add new session
  this.activeSessions.push({
    sessionHandle,
    userAgent,
    ipAddress,
    deviceInfo: deviceInfo || 'Unknown',
    createdAt: new Date(),
    lastActivity: new Date()
  });
  
  return this.save();
};

userSchema.methods.removeActiveSession = function(sessionHandle) {
  this.activeSessions = this.activeSessions.filter(
    session => session.sessionHandle !== sessionHandle
  );
  return this.save();
};

userSchema.methods.updateSessionActivity = function(sessionHandle) {
  const session = this.activeSessions.find(
    s => s.sessionHandle === sessionHandle
  );
  
  if (session) {
    session.lastActivity = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

userSchema.methods.clearAllSessions = function() {
  this.activeSessions = [];
  this.lastLogoutAt = new Date();
  return this.save();
};

userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

userSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

userSchema.methods.updateEmailVerificationStatus = function(isVerified = true) {
  this.isEmailVerified = isVerified;
  return this.save();
};

// Static method to update email verification status by SuperTokens userId
userSchema.statics.updateEmailVerificationBySupertokensUserId = async function(supertokensUserId, isVerified = true) {
  const user = await this.findBySupertokensUserId(supertokensUserId);
  if (user) {
    user.isEmailVerified = isVerified;
    return await user.save();
  }
  return null;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
