const express = require('express');
const router = express.Router();
const emailVerificationController = require('../controllers/emailVerificationController');

/**
 * @swagger
 * /api/v1/email-verification/send-magic-link:
 *   post:
 *     summary: Send email verification magic link
 *     description: Send a magic link for email verification using SuperTokens
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send verification link to
 *     responses:
 *       200:
 *         description: Magic link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verification link sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     method:
 *                       type: string
 *                       example: "magic_link"
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/send-magic-link', emailVerificationController.sendEmailVerification);

/**
 * @swagger
 * /api/v1/email-verification/send-otp:
 *   post:
 *     summary: Send OTP for email verification
 *     description: Send an OTP code for email verification using SuperTokens Passwordless
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send OTP to
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully to your email"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     method:
 *                       type: string
 *                       example: "otp"
 *                     deviceId:
 *                       type: string
 *                     preAuthSessionId:
 *                       type: string
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/send-otp', emailVerificationController.sendOTPVerification);

/**
 * @swagger
 * /api/v1/email-verification/verify-otp:
 *   post:
 *     summary: Verify OTP for email verification
 *     description: Verify the OTP code and mark email as verified
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - deviceId
 *               - preAuthSessionId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 description: The OTP code received via email
 *               deviceId:
 *                 type: string
 *                 description: Device ID from send-otp response
 *               preAuthSessionId:
 *                 type: string
 *                 description: Pre-auth session ID from send-otp response
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     verified:
 *                       type: boolean
 *       400:
 *         description: Invalid OTP or expired
 *       500:
 *         description: Internal server error
 */
router.post('/verify-otp', emailVerificationController.verifyOTP);

/**
 * @swagger
 * /api/v1/email-verification/resend:
 *   post:
 *     summary: Resend email verification
 *     description: Resend email verification with choice of method (magic link or OTP)
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               method:
 *                 type: string
 *                 enum: [magic_link, otp]
 *                 default: magic_link
 *                 description: Verification method to use
 *     responses:
 *       200:
 *         description: Verification sent successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/resend', emailVerificationController.resendVerification);

/**
 * @swagger
 * /api/v1/email-verification/status:
 *   get:
 *     summary: Check email verification status
 *     description: Check if an email address is verified
 *     tags: [Email Verification]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to check
 *     responses:
 *       200:
 *         description: Verification status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/status', emailVerificationController.checkVerificationStatus);

/**
 * @swagger
 * /api/v1/email-verification/test-email:
 *   post:
 *     summary: Send test email to verify email delivery setup
 *     description: Send a test email to check if email delivery is working correctly
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send test email to
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to send test email
 */
router.post('/test-email', emailVerificationController.sendTestEmail);

/**
 * @swagger
 * /api/v1/email-verification/send-direct-otp:
 *   post:
 *     summary: Send OTP directly via email service (testing endpoint)
 *     description: Send OTP directly using the email service, bypassing SuperTokens for testing
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send OTP to
 *     responses:
 *       200:
 *         description: Direct OTP sent successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to send OTP
 */
router.post('/send-direct-otp', emailVerificationController.sendDirectOTP);

/**
 * @swagger
 * /api/v1/email-verification/gmail-test:
 *   post:
 *     summary: Send Gmail-optimized test email
 *     description: Send a specially optimized test email for Gmail delivery
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Gmail address to test
 *     responses:
 *       200:
 *         description: Gmail-optimized email sent successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to send email
 */
router.post('/gmail-test', emailVerificationController.sendGmailTest);

/**
 * @swagger
 * /api/v1/email-verification/sync-status:
 *   post:
 *     summary: Sync email verification status between MongoDB and SuperTokens
 *     description: Manually sync email verification status between MongoDB and SuperTokens metadata
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to sync verification status for
 *     responses:
 *       200:
 *         description: Email verification status synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verification status synced successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     previousStatus:
 *                       type: object
 *                     syncResult:
 *                       type: object
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/sync-status', emailVerificationController.syncEmailVerificationStatus);

/**
 * @swagger
 * /api/v1/email-verification/test-password-reset:
 *   post:
 *     summary: Test password reset email functionality
 *     description: Send a test password reset email to verify the email service is working
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send test password reset email to
 *     responses:
 *       200:
 *         description: Test password reset email sent successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to send test email
 */
router.post('/test-password-reset', emailVerificationController.testPasswordResetEmail);

/**
 * @swagger
 * /api/v1/email-verification/test-supertokens-password-reset:
 *   post:
 *     summary: Test SuperTokens password reset functionality
 *     description: Test the SuperTokens password reset functionality directly
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to test SuperTokens password reset
 *     responses:
 *       200:
 *         description: SuperTokens password reset test successful
 *       400:
 *         description: Bad request or SuperTokens error
 *       500:
 *         description: Internal server error
 */
router.post('/test-supertokens-password-reset', emailVerificationController.testSuperTokensPasswordReset);

module.exports = router;
