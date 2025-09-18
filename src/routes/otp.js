const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

// OTP Routes
router.post('/send-otp', otpController.sendOTP);
router.post('/verify-otp', otpController.verifyOTP);
router.post('/resend-otp', otpController.resendOTP);

// Magic Link Routes
router.post('/send-magic-link', otpController.sendMagicLink);
router.post('/verify-magic-link', otpController.verifyMagicLink);
router.post('/resend-magic-link', otpController.resendMagicLink);

// Verification Status
router.post('/check-verification', otpController.checkVerification);

module.exports = router;
