const mongoose = require('mongoose');

// Minimal User model - most data will be stored in SuperTokens UserMetadata
const userSchema = new mongoose.Schema({
  supertokensUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Keep only essential fields that might need complex querying in MongoDB
  // Everything else will be stored in SuperTokens UserMetadata
  lastLoginAt: {
    type: Date
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
    }
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
  return this.findOne({ supertokensUserId });
};

userSchema.statics.createUser = async function(supertokensUserId, preferences = {}) {
  return this.create({
    supertokensUserId,
    preferences: {
      theme: preferences.theme || 'light',
      notifications: {
        email: preferences.notifications?.email !== false,
        push: preferences.notifications?.push !== false
      }
    }
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
