const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
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
  sendWelcomeEmail
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const profileValidation = [
  body('name').trim().isLength({ min: 2 })
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

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, profileValidation, updateProfile);

// OTP and Email routes
router.post('/send-otp', otpValidation, sendOTP);
router.post('/verify-otp', verifyOTPValidation, verifyOTP);
router.post('/resend-otp', resendOTPValidation, resendOTP);

// Magic Link routes
router.post('/send-magic-link', magicLinkValidation, sendMagicLink);
router.post('/verify-magic-link', verifyMagicLinkValidation, verifyMagicLink);
router.get('/verify-magic-link/:token', verifyMagicLink); // GET route for direct magic link clicks
router.post('/resend-magic-link', resendMagicLinkValidation, resendMagicLink);

// General routes
router.post('/check-verification', otpValidation, checkVerificationStatus);
router.post('/send-welcome', authenticateToken, sendWelcomeEmail);

module.exports = router;
