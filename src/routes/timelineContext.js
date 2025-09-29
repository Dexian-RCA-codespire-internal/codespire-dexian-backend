/**
 * Timeline Context Routes
 * API endpoints for timeline context generation
 */

const express = require('express');
const router = express.Router();

// Import controllers
const timelineContextController = require('../controllers/timelineContextController');

// Import validators
const {
    validateTimelineContextGeneration,
    validateRequestSize,
    validateRateLimit,
    validateLogs
} = require('../validators/timelineContextValidators');

// Import middleware
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     TimelineContextRequest:
 *       type: object
 *       required:
 *         - problemStatement
 *         - ticketCreationTime
 *       properties:
 *         problemStatement:
 *           type: string
 *           description: The problem statement or description
 *           minLength: 1
 *           maxLength: 2000
 *           example: "Application startup failed due to server configuration issues"
 *         ticketCreationTime:
 *           type: string
 *           description: Timestamp when the ticket was created
 *           format: date-time
 *           example: "2025-09-16T18:30:51.364Z"
 *         logs:
 *           type: array
 *           description: Array of log entries (optional)
 *           maxItems: 50
 *           items:
 *             type: object
 *             required:
 *               - time
 *               - service
 *               - level
 *               - message
 *             properties:
 *               time:
 *                 type: string
 *                 description: Timestamp of the log entry
 *                 format: date-time
 *                 example: "2025-09-16T18:30:51.364Z"
 *               service:
 *                 type: string
 *                 description: Name of the service that generated the log
 *                 example: "app-service"
 *               level:
 *                 type: string
 *                 description: Log level
 *                 enum: [ERROR, WARN, INFO, DEBUG, FATAL, TRACE]
 *                 example: "ERROR"
 *               message:
 *                 type: string
 *                 description: Log message content
 *                 maxLength: 1000
 *                 example: "Application startup failed there is some error on the server some pack…"
 *     
 *     TimelineContextResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Timeline description generated successfully"
 *         data:
 *           type: object
 *           properties:
 *             inputData:
 *               type: object
 *               properties:
 *                 hasLogs:
 *                   type: boolean
 *                   example: true
 *                 logCount:
 *                   type: number
 *                   example: 1
 *                 problemStatementLength:
 *                   type: number
 *                   example: 65
 *             timelineDescription:
 *               type: object
 *               properties:
 *                 description:
 *                   type: string
 *                   description: Generated timeline description (20-150 words)
 *                   example: "The application startup failure occurred at 18:30:51, indicating a critical server configuration issue that prevented the app-service from initializing properly."
 *                 context:
 *                   type: string
 *                   description: Additional context about the timeline
 *                   example: "The error suggests a configuration problem during the startup sequence, likely related to missing dependencies or invalid server settings."
 *                 confidence:
 *                   type: number
 *                   description: Confidence score (0-1)
 *                   minimum: 0
 *                   maximum: 1
 *                   example: 0.85
 *             processingTimeMs:
 *               type: number
 *               description: Processing time in milliseconds
 *               example: 1234
 *             metadata:
 *               type: object
 *               properties:
 *                 wordCount:
 *                   type: number
 *                   example: 25
 *                 llmProvider:
 *                   type: string
 *                   example: "gemini"
 *                 temperature:
 *                   type: number
 *                   example: 0.2
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /api/v1/timeline-context/generate:
 *   post:
 *     summary: Generate timeline description
 *     description: Generate a comprehensive timeline description from problem statement, ticket creation time, and logs
 *     tags: [Timeline Context]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimelineContextRequest'
 *           example:
 *             problemStatement: "Application startup failed due to server configuration issues"
 *             ticketCreationTime: "2025-09-16T18:30:51.364Z"
 *             logs:
 *               - time: "2025-09-16T18:30:51.364Z"
 *                 service: "app-service"
 *                 level: "ERROR"
 *                 message: "Application startup failed there is some error on the server some pack…"
 *     responses:
 *       200:
 *         description: Timeline description generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimelineContextResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/generate', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateRateLimit,
    validateLogs,
    validateTimelineContextGeneration,
    timelineContextController.generateTimelineDescription
);

/**
 * @swagger
 * /api/v1/timeline-context/health:
 *   get:
 *     summary: Get timeline context service health status
 *     tags: [Timeline Context]
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
 *                     agent:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     initialized:
 *                       type: boolean
 *                     llmAvailable:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Health check failed
 */
router.get('/health', timelineContextController.getHealthStatus);

/**
 * @swagger
 * /api/v1/timeline-context/capabilities:
 *   get:
 *     summary: Get service capabilities
 *     description: Get detailed information about the timeline context service capabilities
 *     tags: [Timeline Context]
 *     responses:
 *       200:
 *         description: Service capabilities retrieved successfully
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
 *                   example: "Service capabilities retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: string
 *                       example: "Timeline Context Agent"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     capabilities:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Generate timeline descriptions", "Analyze chronological sequence", "Identify patterns"]
 *                     supportedInputs:
 *                       type: array
 *                       items:
 *                         type: string
 *                     outputFormat:
 *                       type: object
 *       500:
 *         description: Failed to get service capabilities
 */
router.get('/capabilities', timelineContextController.getCapabilities);

/**
 * @swagger
 * /api/v1/timeline-context/options:
 *   get:
 *     summary: Get available configuration options
 *     description: Get available configuration options and limits
 *     tags: [Timeline Context]
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
 *                   example: "Available configuration options retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     maxLogEntries:
 *                       type: number
 *                       example: 50
 *                     descriptionLength:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                           example: 20
 *                         max:
 *                           type: number
 *                           example: 150
 *                     allowedLogLevels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["ERROR", "WARN", "INFO", "DEBUG", "FATAL", "TRACE"]
 *                     supportedProviders:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["gemini", "openai", "anthropic", "ollama"]
 *       500:
 *         description: Failed to get available options
 */
router.get('/options', timelineContextController.getAvailableOptions);

module.exports = router;
