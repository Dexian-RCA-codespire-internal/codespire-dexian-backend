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
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    code: String,
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

// Instance methods
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.emailVerificationOTP;
  return user;
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);
  
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

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findBySupertokensUserId = function(supertokensUserId) {
  return this.findOne({ supertokensUserId });
};

userSchema.statics.createUser = async function(supertokensUserId, email, name) {
  const user = new this({
    supertokensUserId,
    email: email.toLowerCase(),
    name
  });
  
  return await user.save();
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
