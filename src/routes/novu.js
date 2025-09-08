const express = require('express');
const router = express.Router();
const novuController = require('../controllers/novuController');
const { authenticateToken } = require('../middleware/auth');

// Health check (public)
router.get('/health', novuController.healthCheck);

// Email/Notification routes (protected)
router.post('/send-otp', authenticateToken, novuController.sendOTP);
router.post('/send-welcome', authenticateToken, novuController.sendWelcomeEmail);
router.post('/send-password-reset', authenticateToken, novuController.sendPasswordResetEmail);
router.post('/send-notification', authenticateToken, novuController.sendNotification);

// Subscriber management routes (protected)
router.post('/subscribers', authenticateToken, novuController.createSubscriber);
router.put('/subscribers', authenticateToken, novuController.updateSubscriber);
router.delete('/subscribers/:email', authenticateToken, novuController.deleteSubscriber);

module.exports = router;

