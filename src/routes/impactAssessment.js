const express = require('express');
const router = express.Router();
const impactAssessmentController = require('../controllers/impactAssessmentController');

/**
 * @swagger
 * /api/v1/impact-assessment/analyze:
 *   post:
 *     summary: Analyze impact based on problem statement and timeline context
 *     description: Performs impact assessment to determine impact level and affected department
 *     tags: [Impact Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - problemStatement
 *               - timelineContext
 *             properties:
 *               problemStatement:
 *                 type: string
 *                 description: Detailed description of the problem or incident
 *                 example: "Database server is down, affecting all customer transactions"
 *               timelineContext:
 *                 type: string
 *                 description: Timeline and context information about the incident
 *                 example: "Incident started at 2:30 PM, affecting 500+ users, critical business hours"
 *     responses:
 *       200:
 *         description: Impact assessment completed successfully
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
 *                   example: "Impact assessment completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     impactAssessments:
 *                       type: array
 *                       description: Array of three different impact assessments from different perspectives
 *                       items:
 *                         type: object
 *                         properties:
 *                           impactAssessment:
 *                             type: string
 *                             description: Detailed assessment of the impact from a specific perspective
 *                             example: "Technical/operational impact assessment focusing on system availability and infrastructure"
 *                           impactLevel:
 *                             type: string
 *                             description: Impact severity level
 *                             enum: [Sev 1 - Critical Impact, Sev 2 - Major Impact, Sev 3 - Normal Impact, Sev 4 - Minor Impact]
 *                             example: "Sev 1 - Critical Impact"
 *                           department:
 *                             type: string
 *                             description: Primary affected department
 *                             enum: [Customer Support, IT Operations, Sales, Finance, Other, Human Resources]
 *                             example: "IT Operations"
 *                           confidence:
 *                             type: integer
 *                             minimum: 0
 *                             maximum: 100
 *                             description: Confidence level in the assessment (0-100%)
 *                             example: 95
 *                           reasoning:
 *                             type: string
 *                             description: Explanation of the assessment reasoning
 *                             example: "Database server failure during peak business hours affects all customer transactions"
 *                           recommendations:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Recommended actions for mitigation
 *                             example: ["Immediate database server restart", "Implement database failover", "Notify customers of service disruption"]
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
 *                   example: "Missing required fields"
 *                 message:
 *                   type: string
 *                   example: "Both problemStatement and timelineContext are required"
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
 *                   example: "Impact assessment failed"
 *                 message:
 *                   type: string
 *                   example: "An error occurred during impact assessment"
 */
router.post('/analyze', impactAssessmentController.analyzeImpact);

/**
 * @swagger
 * /api/v1/impact-assessment/options:
 *   get:
 *     summary: Get available impact levels and departments
 *     description: Returns the list of available impact levels and departments for impact assessment
 *     tags: [Impact Assessment]
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
 *                     impactLevels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Available impact levels
 *                       example: ["Sev 1 - Critical Impact", "Sev 2 - Major Impact", "Sev 3 - Normal Impact", "Sev 4 - Minor Impact"]
 *                     departments:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Available departments
 *                       example: ["Customer Support", "IT Operations", "Sales", "Finance", "Other", "Human Resources"]
 *       500:
 *         description: Internal server error
 */
router.get('/options', impactAssessmentController.getAvailableOptions);

/**
 * @swagger
 * /api/v1/impact-assessment/validate:
 *   post:
 *     summary: Validate input for impact assessment
 *     description: Validates the input data before performing impact assessment
 *     tags: [Impact Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               problemStatement:
 *                 type: string
 *                 description: Problem statement to validate
 *               timelineContext:
 *                 type: string
 *                 description: Timeline context to validate
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
 *                   example: "problemStatement is required and must be a non-empty string"
 *       500:
 *         description: Internal server error
 */
router.post('/validate', impactAssessmentController.validateInput);

module.exports = router;
