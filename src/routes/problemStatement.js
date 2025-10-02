/**
 * Problem Statement Routes
 * API endpoints for problem statement generation
 */

const express = require('express');
const router = express.Router();

// Import controllers
const problemStatementController = require('../controllers/problemStatementController');

// Import validators
const {
    validateProblemStatementGeneration,
    validateCustomProblemStatementGeneration,
    validateBatchProblemStatementGeneration,
    validateRequestSize,
    validateRateLimit,
    validateServerLogs
} = require('../validators/problemStatementValidators');

// Import middleware
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     ProblemStatementRequest:
 *       type: object
 *       required:
 *         - shortDescription
 *       properties:
 *         shortDescription:
 *           type: string
 *           description: Brief description of the issue
 *           minLength: 1
 *           maxLength: 2000
 *           example: "Server is not responding to HTTP requests"
 *         description:
 *           type: string
 *           description: Detailed description of the issue (optional)
 *           maxLength: 2000
 *           example: "The web server has been experiencing intermittent failures since 2 PM today. Users are reporting 500 errors."
 *         serverLogs:
 *           type: array
 *           description: Array of server log entries (optional)
 *           maxItems: 100
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
 *                 example: "2024-01-15T14:30:00Z"
 *               service:
 *                 type: string
 *                 description: Name of the service that generated the log
 *                 example: "nginx"
 *               level:
 *                 type: string
 *                 description: Log level (ERROR, WARN, INFO, DEBUG)
 *                 example: "ERROR"
 *               message:
 *                 type: string
 *                 description: Log message content
 *                 maxLength: 1000
 *                 example: "Connection refused to upstream server"
 *     
 *     CustomProblemStatementRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/ProblemStatementRequest'
 *         - type: object
 *           properties:
 *             options:
 *               type: object
 *               description: Custom generation options
 *               properties:
 *                 temperature:
 *                   type: number
 *                   description: LLM temperature (0-2)
 *                   minimum: 0
 *                   maximum: 2
 *                   example: 0.1
 *                 maxTokens:
 *                   type: integer
 *                   description: Maximum tokens to generate
 *                   minimum: 50
 *                   maximum: 1000
 *                   example: 200
 *                 timeout:
 *                   type: integer
 *                   description: Request timeout in milliseconds
 *                   minimum: 5000
 *                   maximum: 60000
 *                   example: 30000
 *     
 *     BatchProblemStatementRequest:
 *       type: object
 *       required:
 *         - inputDataArray
 *       properties:
 *         inputDataArray:
 *           type: array
 *           description: Array of problem statement requests
 *           minItems: 1
 *           maxItems: 10
 *           items:
 *             $ref: '#/components/schemas/ProblemStatementRequest'
 *     
 *     ProblemStatementResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Problem statement generated successfully"
 *         data:
 *           type: object
 *           properties:
 *             inputData:
 *               type: object
 *               properties:
 *                 hasDescription:
 *                   type: boolean
 *                   example: true
 *                 hasServerLogs:
 *                   type: boolean
 *                   example: true
 *                 logCount:
 *                   type: number
 *                   example: 5
 *             problemStatement:
 *               type: object
 *               properties:
 *                 problemDefinition:
 *                   type: string
 *                   description: Generated problem definition (30-50 words)
 *                   example: "Web server experiencing intermittent HTTP 500 errors causing user access issues and potential revenue loss during peak hours."
 *                 issueType:
 *                   type: string
 *                   enum: [Network, Hardware, Software, Configuration, User Error, Other]
 *                   example: "Software"
 *                 severity:
 *                   type: string
 *                   enum: ["Sev 1 – Critical", "Sev 2 – Major", "Sev 3 – Moderate", "Sev 4 – Minor"]
 *                   example: "Sev 2 – Major"
 *                 businessImpact:
 *                   type: string
 *                   enum: [Revenue Loss, Compliance Issue, Operational Downtime, Customer Support, Other]
 *                   example: "Revenue Loss"
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
 *                   example: 0.1
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *     
 *     AvailableOptionsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Available options retrieved successfully"
 *         data:
 *           type: object
 *           properties:
 *             issueTypes:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["Network", "Hardware", "Software", "Configuration", "User Error", "Other"]
 *             severityLevels:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["Sev 1 – Critical", "Sev 2 – Major", "Sev 3 – Moderate", "Sev 4 – Minor"]
 *             businessImpactCategories:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["Revenue Loss", "Compliance Issue", "Operational Downtime", "Customer Support", "Other"]
 *             wordCountRequirements:
 *               type: object
 *               properties:
 *                 min:
 *                   type: number
 *                   example: 30
 *                 max:
 *                   type: number
 *                   example: 50
 */

/**
 * @swagger
 * /api/v1/problem-statement/generate:
 *   post:
 *     summary: Generate problem statement
 *     description: Generate a comprehensive problem statement including problem definition, issue type, severity, and business impact
 *     tags: [Problem Statement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProblemStatementRequest'
 *           example:
 *             shortDescription: "Server is not responding to HTTP requests"
 *             description: "The web server has been experiencing intermittent failures since 2 PM today. Users are reporting 500 errors."
 *             serverLogs:
 *               - time: "2024-01-15T14:30:00Z"
 *                 service: "nginx"
 *                 level: "ERROR"
 *                 message: "Connection refused to upstream server"
 *               - time: "2024-01-15T14:31:00Z"
 *                 service: "apache"
 *                 level: "ERROR"
 *                 message: "Internal server error"
 *     responses:
 *       200:
 *         description: Problem statement generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProblemStatementResponse'
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
    validateServerLogs,
    validateProblemStatementGeneration,
    problemStatementController.generateProblemStatement
);

/**
 * @swagger
 * /api/v1/problem-statement/generate-skeleton:
 *   post:
 *     summary: Generate skeleton problem statement
 *     description: Generate a skeleton response for loading states
 *     tags: [Problem Statement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProblemStatementRequest'
 *     responses:
 *       200:
 *         description: Skeleton response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProblemStatementResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/generate-skeleton', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateServerLogs,
    validateProblemStatementGeneration,
    problemStatementController.generateProblemStatementSkeleton
);

/**
 * @swagger
 * /api/v1/problem-statement/generate-custom:
 *   post:
 *     summary: Generate custom problem statement
 *     description: Generate problem statement with custom LLM parameters
 *     tags: [Problem Statement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomProblemStatementRequest'
 *           example:
 *             shortDescription: "Database connection timeout"
 *             description: "Users experiencing slow response times when querying the database"
 *             options:
 *               temperature: 0.2
 *               maxTokens: 300
 *               timeout: 45000
 *     responses:
 *       200:
 *         description: Custom problem statement generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProblemStatementResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/generate-custom', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateRateLimit,
    validateServerLogs,
    validateCustomProblemStatementGeneration,
    problemStatementController.generateCustomProblemStatement
);

/**
 * @swagger
 * /api/v1/problem-statement/generate-batch:
 *   post:
 *     summary: Generate multiple problem statements
 *     description: Generate problem statements for multiple issues in batch
 *     tags: [Problem Statement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchProblemStatementRequest'
 *           example:
 *             inputDataArray:
 *               - shortDescription: "Email service down"
 *                 description: "Users cannot send or receive emails"
 *               - shortDescription: "Database slow queries"
 *                 serverLogs:
 *                   - time: "2024-01-15T14:30:00Z"
 *                     service: "mysql"
 *                     level: "WARN"
 *                     message: "Slow query detected"
 *     responses:
 *       200:
 *         description: Batch problem statements generated successfully
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
 *                   example: "Processed 2 problem statement requests in batch"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batchResults:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           inputData:
 *                             type: object
 *                           success:
 *                             type: boolean
 *                           result:
 *                             $ref: '#/components/schemas/ProblemStatementResponse'
 *                           error:
 *                             type: string
 *                     totalProcessed:
 *                       type: number
 *                       example: 2
 *                     successful:
 *                       type: number
 *                       example: 2
 *                     failed:
 *                       type: number
 *                       example: 0
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/generate-batch', 
    // auth.authenticateToken, // Uncomment to enable authentication
    validateRequestSize,
    validateRateLimit,
    validateBatchProblemStatementGeneration,
    problemStatementController.generateProblemStatementsBatch
);

/**
 * @swagger
 * /api/v1/problem-statement/options:
 *   get:
 *     summary: Get available options
 *     description: Get available issue types, severity levels, and business impact categories
 *     tags: [Problem Statement]
 *     responses:
 *       200:
 *         description: Available options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailableOptionsResponse'
 *       500:
 *         description: Failed to get available options
 */
router.get('/options', problemStatementController.getAvailableOptions);

/**
 * @swagger
 * /api/v1/problem-statement/capabilities:
 *   get:
 *     summary: Get service capabilities
 *     description: Get detailed information about the problem statement service capabilities
 *     tags: [Problem Statement]
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
 *                       example: "Problem Statement Agent"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     capabilities:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Generate problem definitions (30-50 words)", "Classify issue types", "Assess severity levels"]
 *                     supportedInputs:
 *                       type: array
 *                       items:
 *                         type: string
 *                     outputFormat:
 *                       type: object
 *       500:
 *         description: Failed to get service capabilities
 */
router.get('/capabilities', problemStatementController.getCapabilities);

/**
 * @swagger
 * /api/v1/problem-statement/health:
 *   get:
 *     summary: Get problem statement service health status
 *     tags: [Problem Statement]
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
router.get('/health', problemStatementController.getHealthStatus);

module.exports = router;
