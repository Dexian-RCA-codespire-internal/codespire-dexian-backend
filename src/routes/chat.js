// new file servicenow
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { body, query, validationResult } = require('express-validator');

// Rate limiting for chat endpoints
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many chat requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all chat routes
router.use(chatRateLimit);

// Input validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * /api/chat/send-message:
 *   post:
 *     summary: Send a message to the chatbot
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - sessionId
 *               - service
 *             properties:
 *               message:
 *                 type: string
 *                 description: The message to send to the chatbot
 *               sessionId:
 *                 type: string
 *                 description: Session identifier for conversation history
 *               service:
 *                 type: string
 *                 enum: [gemini, openai, anthropic, ollama]
 *                 description: AI service to use for response generation
 *               context:
 *                 type: object
 *                 description: Additional context for the conversation
 *     responses:
 *       200:
 *         description: Message processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 service:
 *                   type: string
 *                 usage:
 *                   type: object
 *       400:
 *         description: Bad request - validation failed
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post('/send-message', 
  authenticateToken,
  [
    body('message').isString().isLength({ min: 1, max: 4000 }).trim().escape(),
    body('sessionId').isString().isLength({ min: 1, max: 100 }).trim(),
    body('service').isIn(['gemini', 'openai', 'anthropic', 'ollama']),
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    await chatController.sendMessage(req, res);
  }
);

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Get conversation history for current session
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Session identifier
 *     responses:
 *       200:
 *         description: Conversation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [user, assistant]
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/history',
  authenticateToken,
  [
    query('sessionId').optional().isString().isLength({ min: 1, max: 100 }).trim()
  ],
  validateRequest,
  async (req, res) => {
    await chatController.getHistory(req, res);
  }
);

/**
 * @swagger
 * /api/chat/history:
 *   delete:
 *     summary: Clear conversation history for current session
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Session identifier to clear
 *     responses:
 *       200:
 *         description: History cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/history',
  authenticateToken,
  [
    body('sessionId').optional().isString().isLength({ min: 1, max: 100 }).trim()
  ],
  validateRequest,
  async (req, res) => {
    await chatController.clearHistory(req, res);
  }
);

/**
 * @swagger
 * /api/chat/services:
 *   get:
 *     summary: Get available AI services
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Available services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 services:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [gemini, openai, anthropic, ollama]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/services',
  authenticateToken,
  async (req, res) => {
    await chatController.getAvailableServices(req, res);
  }
);

/**
 * @swagger
 * /api/chat/test-service:
 *   get:
 *     summary: Test connection to specific AI service
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [gemini, openai, anthropic, ollama]
 *         description: AI service to test
 *     responses:
 *       200:
 *         description: Service test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 service:
 *                   type: string
 *       400:
 *         description: Bad request - invalid service
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/test-service',
  authenticateToken,
  [
    query('service').isIn(['gemini', 'openai', 'anthropic', 'ollama'])
  ],
  validateRequest,
  async (req, res) => {
    await chatController.testService(req, res);
  }
);

/**
 * @swagger
 * /api/chat/welcome:
 *   get:
 *     summary: Get welcome message for ChatBot
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Welcome message retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/welcome',
  authenticateToken,
  async (req, res) => {
    await chatController.getWelcomeMessage(req, res);
  }
);

module.exports = router;
