/**
 * RCA Generation Routes
 * API endpoints for RCA generation operations
 */

const express = require('express');
const router = express.Router();

// Import controllers
const rcaController = require('../controllers/rcaGenerationController');

// Import validators
const {
    validateRCAGeneration,
    validateCustomerSummaryGeneration,
    validateStreamingRCAGeneration,
    validateRequestSize
} = require('../validators/rcaGenerationValidators');

// Import middleware
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     RCATicketData:
 *       type: object
 *       required:
 *         - ticket_id
 *         - short_description
 *       properties:
 *         ticket_id:
 *           type: string
 *           description: Ticket identifier
 *           example: "INC0001234"
 *         short_description:
 *           type: string
 *           description: Short description of the ticket
 *           example: "System outage affecting multiple users"
 *         description:
 *           type: string
 *           description: Detailed description of the ticket
 *           example: "Complete system outage occurred at 2:00 PM affecting all users"
 *         category:
 *           type: string
 *           description: Category of the ticket
 *           example: "Infrastructure"
 *         priority:
 *           type: string
 *           description: Priority level
 *           example: "High"
 *         impact:
 *           type: string
 *           description: Impact level
 *           example: "Major"
 *         source:
 *           type: string
 *           description: Source system
 *           example: "ServiceNow"
 *     
 *     RCAFields:
 *       type: object
 *       required:
 *         - problem
 *         - timeline
 *         - impact
 *         - rootCause
 *         - correctiveActions
 *       properties:
 *         problem:
 *           type: string
 *           description: Description of the problem
 *           minLength: 10
 *           maxLength: 1000
 *           example: "System experienced complete outage due to database connectivity issues"
 *         timeline:
 *           type: string
 *           description: Timeline of events
 *           minLength: 10
 *           maxLength: 1000
 *           example: "2:00 PM - Issue reported, 2:15 PM - Investigation started, 3:30 PM - Root cause identified"
 *         impact:
 *           type: string
 *           description: Impact assessment
 *           minLength: 10
 *           maxLength: 1000
 *           example: "All 500+ users unable to access the system, business operations halted"
 *         rootCause:
 *           type: string
 *           description: Root cause analysis
 *           minLength: 10
 *           maxLength: 1000
 *           example: "Database connection pool exhausted due to memory leak in application server"
 *         correctiveActions:
 *           type: string
 *           description: Corrective actions taken
 *           minLength: 10
 *           maxLength: 1000
 *           example: "Restarted application servers, increased connection pool size, deployed memory leak fix"
 *     
 *     RCAGenerationRequest:
 *       type: object
 *       required:
 *         - ticketData
 *         - rcaFields
 *       properties:
 *         ticketData:
 *           $ref: '#/components/schemas/RCATicketData'
 *         rcaFields:
 *           $ref: '#/components/schemas/RCAFields'
 *     
 *     RCAGenerationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Complete RCA generated successfully"
 *         data:
 *           type: object
 *           properties:
 *             technicalRCA:
 *               type: string
 *               description: Generated technical RCA report
 *             customerSummary:
 *               type: string
 *               description: Customer-friendly summary
 *             ticketData:
 *               $ref: '#/components/schemas/RCATicketData'
 *             rcaFields:
 *               $ref: '#/components/schemas/RCAFields'
 *             processing_time_ms:
 *               type: number
 *               description: Processing time in milliseconds
 *             generatedAt:
 *               type: string
 *               format: date-time
 *               description: Generation timestamp
 */

/**
 * @swagger
 * /api/rca/generate:
 *   post:
 *     summary: Generate complete RCA (both technical and customer-friendly)
 *     tags: [RCA Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RCAGenerationRequest'
 *           example:
 *             ticketData:
 *               ticket_id: "INC0001234"
 *               short_description: "System outage affecting multiple users"
 *               description: "Complete system outage occurred at 2:00 PM"
 *               category: "Infrastructure"
 *               priority: "High"
 *               impact: "Major"
 *               source: "ServiceNow"
 *             rcaFields:
 *               problem: "System experienced complete outage due to database connectivity issues"
 *               timeline: "2:00 PM - Issue reported, 2:15 PM - Investigation started, 3:30 PM - Root cause identified"
 *               impact: "All 500+ users unable to access the system, business operations halted"
 *               rootCause: "Database connection pool exhausted due to memory leak in application server"
 *               correctiveActions: "Restarted application servers, increased connection pool size, deployed memory leak fix"
 *     responses:
 *       200:
 *         description: RCA generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RCAGenerationResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/generate', 
    // auth.authenticateToken, // Temporarily disabled for testing
    validateRequestSize,
    validateRCAGeneration,
    rcaController.generateCompleteRCA
);

/**
 * @swagger
 * /api/rca/technical:
 *   post:
 *     summary: Generate technical RCA only
 *     tags: [RCA Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RCAGenerationRequest'
 *     responses:
 *       200:
 *         description: Technical RCA generated successfully
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
 *                     technicalRCA:
 *                       type: string
 *                     processing_time_ms:
 *                       type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/technical', 
    // auth.authenticateToken, // Temporarily disabled for testing
    validateRequestSize,
    validateRCAGeneration,
    rcaController.generateTechnicalRCA
);

/**
 * @swagger
 * /api/rca/customer-summary:
 *   post:
 *     summary: Generate customer-friendly summary from technical RCA
 *     tags: [RCA Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - technicalRCA
 *               - ticketData
 *             properties:
 *               technicalRCA:
 *                 type: string
 *                 description: Previously generated technical RCA
 *               ticketData:
 *                 $ref: '#/components/schemas/RCATicketData'
 *     responses:
 *       200:
 *         description: Customer summary generated successfully
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
 *                     customerSummary:
 *                       type: string
 *                     processing_time_ms:
 *                       type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/customer-summary', 
    // auth.authenticateToken, // Temporarily disabled for testing
    validateRequestSize,
    validateCustomerSummaryGeneration,
    rcaController.generateCustomerSummary
);

/**
 * @swagger
 * /api/rca/stream:
 *   post:
 *     summary: Generate RCA with real-time streaming via WebSocket
 *     tags: [RCA Generation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-socket-id
 *         required: true
 *         schema:
 *           type: string
 *         description: WebSocket connection ID for streaming
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RCAGenerationRequest'
 *     responses:
 *       200:
 *         description: Streaming started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 socketId:
 *                   type: string
 *                 events:
 *                   type: object
 *                   properties:
 *                     progress:
 *                       type: string
 *                     generation:
 *                       type: string
 *                     complete:
 *                       type: string
 *                     error:
 *                       type: string
 *       400:
 *         description: Validation error or missing socket ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/stream', 
    // auth.authenticateToken, // Temporarily disabled for testing
    validateRequestSize,
    validateStreamingRCAGeneration,
    rcaController.generateStreamingRCA
);

/**
 * @swagger
 * /api/rca/health:
 *   get:
 *     summary: Get RCA service health status
 *     tags: [RCA Generation]
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
 *       500:
 *         description: Health check failed
 */
router.get('/health', rcaController.getHealthStatus);

/**
 * @swagger
 * /api/rca/websocket-status:
 *   get:
 *     summary: Get WebSocket connection status
 *     tags: [RCA Generation]
 *     responses:
 *       200:
 *         description: WebSocket status retrieved successfully
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
 *                     connectedClients:
 *                       type: number
 *                     websocketEnabled:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Failed to get WebSocket status
 */
router.get('/websocket-status', rcaController.getWebSocketStatus);

module.exports = router;
