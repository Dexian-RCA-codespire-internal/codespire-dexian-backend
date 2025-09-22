/**
 * Ticket Resolution Routes
 * API endpoints for ticket resolution operations
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
    resolveTicket
} = require('../controllers/ticketResolutionController');

// Import validators
const {
    validateTicketResolution,
    validateTicketStructure
} = require('../validators/ticketResolutionValidators');

// Import middleware
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     TicketResolution:
 *       type: object
 *       required:
 *         - rootCause
 *         - ticket
 *       properties:
 *         rootCause:
 *           type: string
 *           description: Root cause analysis of the ticket
 *           minLength: 10
 *           maxLength: 2000
 *         ticket:
 *           type: object
 *           required:
 *             - _id
 *             - ticket_id
 *             - source
 *             - short_description
 *             - category
 *             - raw
 *           properties:
 *             _id:
 *               type: string
 *               description: MongoDB ObjectId of the ticket
 *             ticket_id:
 *               type: string
 *               description: Ticket identifier
 *             source:
 *               type: string
 *               enum: [ServiceNow, Jira, Remedy, Other]
 *               description: Source system of the ticket
 *             short_description:
 *               type: string
 *               description: Short description of the ticket
 *             description:
 *               type: string
 *               description: Detailed description of the ticket (optional)
 *             category:
 *               type: string
 *               description: Category of the ticket
 *             priority:
 *               type: string
 *               description: Priority level
 *             impact:
 *               type: string
 *               description: Impact level
 *             urgency:
 *               type: string
 *               description: Urgency level
 *             raw:
 *               type: object
 *               properties:
 *                 sys_id:
 *                   type: string
 *                   description: ServiceNow system ID
 *     ResolutionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             resolution:
 *               type: object
 *               properties:
 *                 rootCause:
 *                   type: string
 *                 closeCode:
 *                   type: string
 *                 customerSummary:
 *                   type: string
 *                 problemStatement:
 *                   type: string
 *                 analysis:
 *                   type: string
 *             rcaRecord:
 *               type: object
 *             serviceNowUpdate:
 *               type: object
 */

/**
 * @swagger
 * /api/tickets/resolve:
 *   post:
 *     summary: Resolve a ticket with root cause analysis
 *     tags: [Ticket Resolution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TicketResolution'
 *     responses:
 *       200:
 *         description: Ticket resolved successfully
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
 *                   example: "Ticket resolved successfully"
 *       400:
 *         description: Validation error or resolution failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/resolve', 
    auth.authenticateToken,
    validateTicketResolution,
    validateTicketStructure,
    resolveTicket
);


module.exports = router;
