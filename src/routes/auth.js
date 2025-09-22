const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { doc } = require('../utils/apiDoc');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  sendOTP,
  verifyOTP,
  resendOTP,
  sendMagicLink,
  verifyMagicLink,
  resendMagicLink,
  checkVerificationStatus,
  sendWelcomeEmail,
  generateEmailVerificationToken,
  verifyEmailToken,
  verifyCustomOTP,
  forgotPassword,
  resetPasswordWithToken
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').optional().trim().isLength({ min: 2 }),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().trim().isLength({ min: 10 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const profileValidation = [
  body('name').optional().trim().isLength({ min: 2 }),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().trim().isLength({ min: 10 })
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail()
];

const resetPasswordValidation = [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 6 })
];


const otpValidation = [
  body('email').isEmail().normalizeEmail()
];

const verifyOTPValidation = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('deviceId').notEmpty(),
  body('preAuthSessionId').notEmpty()
];

const resendOTPValidation = [
  body('email').isEmail().normalizeEmail(),
  body('deviceId').notEmpty(),
  body('preAuthSessionId').notEmpty()
];

const magicLinkValidation = [
  body('email').isEmail().normalizeEmail()
];

const verifyMagicLinkValidation = [
  body('linkCode').notEmpty()
];

const resendMagicLinkValidation = [
  body('email').isEmail().normalizeEmail(),
  body('deviceId').notEmpty(),
  body('preAuthSessionId').notEmpty()
];

// Authentication Routes
router.post('/register', 
  doc.create('/auth/register', 'Register a new user account', ['Authentication'], {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
      password: { type: 'string', minLength: 6, description: 'User password (minimum 6 characters)' }
    },
    required: ['email', 'password']
  }),
  registerValidation, register);

router.post('/login', 
  doc.create('/auth/login', 'Login with email and password', ['Authentication'], {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
      password: { type: 'string', description: 'User password' }
    },
    required: ['email', 'password']
  }),
  loginValidation, login);

router.post('/logout', 
  doc.post('/auth/logout', 'Logout current user session', ['Authentication']),
  authenticateToken, logout);

router.get('/profile', 
  doc.get('/auth/profile', 'Get current user profile information', ['Authentication']),
  authenticateToken, getProfile);

router.put('/profile', 
  doc.update('/auth/profile', 'Update user profile information', ['Authentication'], {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, description: 'Full name' }
    },
    required: ['name']
  }),
  authenticateToken, profileValidation, updateProfile);

// OTP Authentication Routes
router.post('/send-otp', 
  doc.post('/auth/send-otp', 'Send OTP code to user email for verification', ['Authentication', 'OTP']),
  otpValidation, sendOTP);

router.post('/verify-otp', 
  doc.post('/auth/verify-otp', 'Verify OTP code for user authentication', ['Authentication', 'OTP']),
  verifyOTPValidation, verifyOTP);

router.post('/resend-otp', 
  doc.post('/auth/resend-otp', 'Resend OTP code to user email', ['Authentication', 'OTP']),
  resendOTPValidation, resendOTP);

// Magic Link Authentication Routes
router.post('/send-magic-link', 
  doc.post('/auth/send-magic-link', 'Send magic link to user email for passwordless login', ['Authentication', 'Magic Link']),
  magicLinkValidation, sendMagicLink);

router.post('/verify-magic-link', 
  doc.post('/auth/verify-magic-link', 'Verify magic link code for authentication', ['Authentication', 'Magic Link']),
  verifyMagicLinkValidation, verifyMagicLink);

router.get('/verify-magic-link/:token', 
  doc.get('/auth/verify-magic-link/{token}', 'Direct magic link verification via URL click', ['Authentication', 'Magic Link']),
  verifyMagicLink);

router.post('/resend-magic-link', 
  doc.post('/auth/resend-magic-link', 'Resend magic link to user email', ['Authentication', 'Magic Link']),
  resendMagicLinkValidation, resendMagicLink);

// Password Reset Routes
router.post('/forgot-password', 
  doc.post('/auth/forgot-password', 'Send password reset email to user', ['Authentication', 'Password Reset']),
  forgotPasswordValidation, forgotPassword);

router.post('/reset-password', 
  doc.post('/auth/reset-password', 'Reset password using reset token', ['Authentication', 'Password Reset']),
  resetPasswordValidation, resetPasswordWithToken);

// Additional Authentication Routes
router.post('/check-verification', 
  doc.post('/auth/check-verification', 'Check email verification status for user', ['Authentication']),
  otpValidation, checkVerificationStatus);

router.post('/send-welcome', 
  doc.post('/auth/send-welcome', 'Send welcome email to authenticated user', ['Authentication']),
  authenticateToken, sendWelcomeEmail);

router.post('/generate-email-verification-token', 
  doc.post('/auth/generate-email-verification-token', 'Generate email verification token', ['Authentication', 'Email Verification']),
  authenticateToken, generateEmailVerificationToken);

router.post('/verify-email-token', 
  doc.post('/auth/verify-email-token', 'Verify email using verification token', ['Authentication', 'Email Verification']),
  authenticateToken, verifyEmailToken);

router.post('/verify-custom-otp', 
  doc.post('/auth/verify-custom-otp', 'Verify custom OTP for authenticated user', ['Authentication', 'OTP']),
  authenticateToken, verifyCustomOTP);

module.exports = router;
