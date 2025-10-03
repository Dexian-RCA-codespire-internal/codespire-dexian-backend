/**
 * RCA Root Cause Analysis Routes
 * API endpoints for root cause analysis operations
 */

const express = require('express');
const router = express.Router();
const rcaRootCauseController = require('../controllers/rcaRootCauseController');

/**
 * @swagger
 * /api/rca-root-cause/analyze:
 *   post:
 *     summary: Analyze root causes for a ticket
 *     description: Analyzes the provided ticket against similar historical tickets to identify potential root causes with supporting evidence and confidence scores
 *     tags: [RCA Root Cause Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentTicket
 *             properties:
 *               currentTicket:
 *                 type: object
 *                 required:
 *                   - category
 *                   - description
 *                   - short_description
 *                 properties:
 *                   category:
 *                     type: string
 *                     example: "Network Infrastructure"
 *                   description:
 *                     type: string
 *                     example: "Critical network connectivity issues affecting multiple services"
 *                   short_description:
 *                     type: string
 *                     example: "Network connectivity issues causing service degradation"
 *                   enhanced_problem:
 *                     type: string
 *                     example: "The network infrastructure is experiencing severe connectivity disruptions"
 *                   priority:
 *                     type: string
 *                     example: "High"
 *                   urgency:
 *                     type: string
 *                     example: "Critical"
 *                   impact:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Service degradation affecting 80% of users", "Multiple application timeouts"]
 *                   source:
 *                     type: string
 *                     example: "ServiceNow"
 *               similarTickets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "INC-2024-1234"
 *                     short_description:
 *                       type: string
 *                       example: "Database connection pool exhaustion"
 *                     category:
 *                       type: string
 *                       example: "Database"
 *                     description:
 *                       type: string
 *                       example: "Connection pool reached maximum capacity"
 *                     priority:
 *                       type: string
 *                       example: "High"
 *                     subcategory:
 *                       type: string
 *                       example: "email"
 *     responses:
 *       200:
 *         description: Root cause analysis completed successfully
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
 *                   example: "Root cause analysis completed successfully"
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       rootCause:
 *                         type: string
 *                         example: "BGP Routing Configuration Error"
 *                       analysis:
 *                         type: string
 *                         example: "Network infrastructure failure due to misconfigured BGP routing tables"
 *                       confidence:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 100
 *                         example: 95
 *                       evidence:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               example: "Log Analysis"
 *                             finding:
 *                               type: string
 *                               example: "BGP route flapping detected in router logs"
 *                             source:
 *                               type: string
 *                               example: "INC-2024-1234"
 *                 analysis_metadata:
 *                   type: object
 *                   properties:
 *                     total_root_causes:
 *                       type: integer
 *                       example: 4
 *                     highest_confidence:
 *                       type: integer
 *                       example: 95
 *                     average_confidence:
 *                       type: integer
 *                       example: 82
 *                     ticket_category:
 *                       type: string
 *                       example: "Network Infrastructure"
 *                     similar_tickets_analyzed:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/analyze', rcaRootCauseController.analyzeRootCauses);

/**
 * @swagger
 * /api/rca-root-cause/capabilities:
 *   get:
 *     summary: Get agent capabilities and information
 *     description: Returns information about the RCA Root Cause Analysis agent capabilities, supported operations, and requirements
 *     tags: [RCA Root Cause Analysis]
 *     responses:
 *       200:
 *         description: Agent capabilities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 name:
 *                   type: string
 *                   example: "Root Cause Analysis Agent"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                 capabilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                 supported_categories:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/capabilities', rcaRootCauseController.getCapabilities);

/**
 * @swagger
 * /api/rca-root-cause/health:
 *   get:
 *     summary: Health check for RCA Root Cause Analysis agent
 *     description: Returns the health status of the RCA Root Cause Analysis agent and its components
 *     tags: [RCA Root Cause Analysis]
 *     responses:
 *       200:
 *         description: Agent is healthy and operational
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
 *                   example: "Root Cause Analysis agent is healthy"
 *                 health:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     agent:
 *                       type: string
 *                       example: "rca-root-cause"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     components:
 *                       type: object
 *       503:
 *         description: Agent is unhealthy or experiencing issues
 */
router.get('/health', rcaRootCauseController.healthCheck);

module.exports = router;