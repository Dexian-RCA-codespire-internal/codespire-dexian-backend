const express = require('express');
const router = express.Router();
const textEnhancementController = require('../controllers/textEnhancementController');

/**
 * @swagger
 * /api/v1/text-enhancement/enhance:
 *   post:
 *     summary: Enhance text quality while maintaining conciseness
 *     description: Improves text clarity, grammar, and style while keeping it concise
 *     tags: [Text Enhancement]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to be enhanced
 *                 example: "this is a bad text with errors and unclear meaning"
 *               reference:
 *                 type: string
 *                 description: Reference context for enhancement (optional)
 *                 example: "Business communication about project updates"
 *     responses:
 *       200:
 *         description: Text enhanced successfully
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
 *                   example: "Text enhanced successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     enhancedText:
 *                       type: string
 *                       description: The enhanced version of the text
 *                       example: "This is a well-written text with clear meaning and proper grammar."
 *                     enhancementType:
 *                       type: string
 *                       example: "clarity"
 *                       description: "Always 'clarity' (default)"
 *                     qualityLevel:
 *                       type: string
 *                       example: "standard"
 *                       description: "Always 'standard' (default)"
 *                     enhancementRatio:
 *                       type: number
 *                       description: Ratio of enhanced text length to original (should be ≤ 1.3)
 *                       example: 1.15
 *                     improvements:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of specific improvements made
 *                       example: ["Fixed grammar errors", "Improved clarity", "Enhanced sentence structure"]
 *                     confidence:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Confidence level in the enhancement (0-100%)
 *                       example: 85
 *       400:
 *         description: Bad request - missing or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Missing required field"
 *                 message:
 *                   type: string
 *                   example: "text is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Text enhancement failed"
 *                 message:
 *                   type: string
 *                   example: "An error occurred during text enhancement"
 */
router.post('/enhance', textEnhancementController.enhanceText);

/**
 * @swagger
 * /api/v1/text-enhancement/options:
 *   get:
 *     summary: Get available enhancement types and quality levels
 *     description: Returns the list of available enhancement types and quality levels
 *     tags: [Text Enhancement]
 *     responses:
 *       200:
 *         description: Available options retrieved successfully
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
 *                   example: "Available options retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     enhancementTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Available enhancement types
 *                       example: ["grammar", "clarity", "professional", "concise", "engaging", "technical", "creative"]
 *                     qualityLevels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Available quality levels
 *                       example: ["basic", "standard", "premium"]
 *                     focusAreas:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Available focus areas
 *                       example: ["grammar_and_spelling", "sentence_structure", "word_choice", "tone_and_style"]
 *       500:
 *         description: Internal server error
 */
router.get('/options', textEnhancementController.getAvailableOptions);

/**
 * @swagger
 * /api/v1/text-enhancement/validate:
 *   post:
 *     summary: Validate input for text enhancement
 *     description: Validates the input data before performing text enhancement
 *     tags: [Text Enhancement]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to validate
 *               reference:
 *                 type: string
 *                 description: Reference context to validate
 *               enhancementType:
 *                 type: string
 *                 description: Enhancement type to validate
 *               qualityLevel:
 *                 type: string
 *                 description: Quality level to validate
 *     responses:
 *       200:
 *         description: Input validation completed
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
 *                   example: "Input validation completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *       400:
 *         description: Input validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Input validation failed"
 *                 message:
 *                   type: string
 *                   example: "text is required and must be a non-empty string"
 *       500:
 *         description: Internal server error
 */
router.post('/validate', textEnhancementController.validateInput);

module.exports = router;
