/**
 * @deprecated These routes are deprecated and will be removed.
 * Use /api/v1/email-verification/* routes instead.
 * 
 * MIGRATION GUIDE:
 * - /api/v1/otp/send-otp → /api/v1/email-verification/send-otp
 * - /api/v1/otp/verify-otp → /api/v1/email-verification/verify-otp
 * - /api/v1/otp/send-magic-link → /api/v1/email-verification/send-magic-link
 * 
 * This file will be removed in the next major version.
 */

console.warn('⚠️ DEPRECATED: OTP routes are deprecated. Use email-verification routes instead.');

const express = require('express');
const router = express.Router();
const otpController = require('../../../otpController');

// DEPRECATED OTP Routes - Use email-verification routes instead
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
