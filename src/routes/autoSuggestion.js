/**
 * Auto-Suggestion Routes
 * API endpoints for intelligent text auto-completion
 */

const express = require('express');
const router = express.Router();

// Import controllers
const autoSuggestionController = require('../controllers/autoSuggestionController');

// Import validators
const {
    validateSuggestionGeneration,
    validateMultipleSuggestions,
    validateRequestSize,
    validateRateLimit
} = require('../validators/autoSuggestionValidators');

// Import middleware
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     SuggestionRequest:
 *       type: object
 *       required:
 *         - currentText
 *       properties:
 *         currentText:
 *           type: string
 *           description: The text that user has entered for auto-suggestion
 *           minLength: 1
 *           maxLength: 1000
 *           example: "Dear John, I hope you are"
 *         reference:
 *           type: string
 *           description: Reference context to inform the suggestion
 *           maxLength: 2000
 *           example: "Email about project status update for Q4 deliverables"
 *     
 *     MultipleSuggestionRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/SuggestionRequest'
 *         - type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Number of alternative suggestions to generate
 *               minimum: 1
 *               maximum: 10
 *               example: 3
 *     
 *     SuggestionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Suggestion generated successfully"
 *         data:
 *           type: object
 *           properties:
 *             suggestion:
 *               type: string
 *               description: The generated text suggestion
 *               example: "doing well today"
 *             type:
 *               type: string
 *               description: Type of suggestion generated
 *               enum: [word_completion, sentence_completion, context_aware]
 *               example: "sentence_completion"
 *             confidence:
 *               type: number
 *               description: Confidence score (0-1)
 *               minimum: 0
 *               maximum: 1
 *               example: 0.85
 *             cached:
 *               type: boolean
 *               description: Whether the suggestion was retrieved from cache
 *               example: false
 *             processing_time_ms:
 *               type: number
 *               description: Processing time in milliseconds
 *               example: 234
 *             generatedAt:
 *               type: string
 *               format: date-time
 *               description: Generation timestamp
 *     
 *     MultipleSuggestionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Generated 3 suggestion(s)"
 *         data:
 *           type: object
 *           properties:
 *             suggestions:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   suggestion:
 *                     type: string
 *                     example: "doing well today"
 *                   type:
 *                     type: string
 *                     example: "sentence_completion"
 *                   confidence:
 *                     type: number
 *                     example: 0.85
 *                   cached:
 *                     type: boolean
 *                     example: false
 *             count:
 *               type: number
 *               description: Number of suggestions generated
 *               example: 3
 *             processing_time_ms:
 *               type: number
 *               example: 456
 *             generatedAt:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/v1/auto-suggestion/suggest:
 *   post:
 *     summary: Generate text auto-suggestion
 *     description: Generate intelligent text completion similar to Gmail smart compose
 *     tags: [Auto-Suggestion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuggestionRequest'
 *           example:
 *             currentText: "Dear John, I hope you are"
 *             reference: "Email about project status update for Q4 deliverables"
 *     responses:
 *       200:
 *         description: Suggestion generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuggestionResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/suggest', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateRateLimit,
    validateSuggestionGeneration,
    autoSuggestionController.generateSuggestion
);

/**
 * @swagger
 * /api/v1/auto-suggestion/auto-suggest:
 *   post:
 *     summary: Generate auto-suggestions with dynamic count
 *     description: Generate intelligent text completions with automatically determined count based on context
 *     tags: [Auto-Suggestion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuggestionRequest'
 *           example:
 *             currentText: "Dear John, I hope you are"
 *             reference: "Email about project status update for Q4 deliverables"
 *     responses:
 *       200:
 *         description: Auto-suggestions generated successfully
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
 *                   example: "Generated 3 suggestion(s) (dynamic count)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           suggestion:
 *                             type: string
 *                           type:
 *                             type: string
 *                           confidence:
 *                             type: number
 *                           cached:
 *                             type: boolean
 *                     requestedCount:
 *                       type: number
 *                       description: Number of suggestions requested
 *                     actualCount:
 *                       type: number
 *                       description: Number of suggestions generated
 *                     dynamicCount:
 *                       type: boolean
 *                       description: Whether count was automatically determined
 *                       example: true
 *                     suggestionType:
 *                       type: string
 *                       description: Type of suggestion generated
 *                     processing_time_ms:
 *                       type: number
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/auto-suggest', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateRateLimit,
    validateSuggestionGeneration,
    autoSuggestionController.generateAutoSuggestions
);

/**
 * @swagger
 * /api/v1/auto-suggestion/suggest-multiple:
 *   post:
 *     summary: Generate multiple text auto-suggestions
 *     description: Generate multiple alternative text completions
 *     tags: [Auto-Suggestion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MultipleSuggestionRequest'
 *           example:
 *             currentText: "Dear John, I hope you are"
 *             reference: "Email about project status update for Q4 deliverables"
 *             count: 3
 *     responses:
 *       200:
 *         description: Multiple suggestions generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultipleSuggestionResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/suggest-multiple', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateRateLimit,
    validateMultipleSuggestions,
    autoSuggestionController.generateMultipleSuggestions
);

/**
 * @swagger
 * /api/v1/auto-suggestion/health:
 *   get:
 *     summary: Get auto-suggestion service health status
 *     tags: [Auto-Suggestion]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     initialized:
 *                       type: boolean
 *                     agentInitialized:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     config:
 *                       type: object
 *                     cache:
 *                       type: object
 *       500:
 *         description: Health check failed
 */
router.get('/health', autoSuggestionController.getHealthStatus);

/**
 * @swagger
 * /api/v1/auto-suggestion/cache/clear:
 *   post:
 *     summary: Clear suggestion cache
 *     tags: [Auto-Suggestion]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to clear cache
 */
router.post('/cache/clear', 
    // auth.authenticateToken, // Uncomment to enable authentication
    autoSuggestionController.clearCache
);

/**
 * @swagger
 * /api/v1/auto-suggestion/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [Auto-Suggestion]
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cache:
 *                       type: object
 *                       properties:
 *                         size:
 *                           type: number
 *                         enabled:
 *                           type: boolean
 *                         ttl:
 *                           type: number
 *       500:
 *         description: Failed to get cache statistics
 */
router.get('/cache/stats', autoSuggestionController.getCacheStats);

module.exports = router;
