// new file servicenow
const express = require('express');
const router = express.Router();
const playbookController = require('../controllers/playbookController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes (commented out for testing)
// router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Step:
 *       type: object
 *       required:
 *         - step_id
 *         - title
 *         - action
 *         - expected_outcome
 *       properties:
 *         step_id:
 *           type: number
 *           description: Step number
 *         title:
 *           type: string
 *           description: Step title
 *         action:
 *           type: string
 *           description: Action to perform
 *         expected_outcome:
 *           type: string
 *           description: Expected outcome
 *         resources:
 *           type: array
 *           items:
 *             type: string
 *           description: List of resources/URLs
 *     
 *     Playbook:
 *       type: object
 *       required:
 *         - playbook_id
 *         - title
 *         - description
 *         - priority
 *         - steps
 *         - outcome
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         playbook_id:
 *           type: string
 *           description: Unique playbook identifier
 *         title:
 *           type: string
 *           description: Playbook title
 *         description:
 *           type: string
 *           description: Playbook description
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Critical]
 *           description: Priority level
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: List of tags
 *         usage:
 *           type: string
 *           description: Usage statistics
 *         confidence:
 *           type: string
 *           description: Confidence percentage
 *         steps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Step'
 *           description: List of steps
 *         outcome:
 *           type: string
 *           description: Expected final outcome
 *         created_by:
 *           type: string
 *           description: Creator user ID
 *         is_active:
 *           type: boolean
 *           description: Whether playbook is active
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     
 *     PlaybookInput:
 *       type: object
 *       required:
 *         - playbook_id
 *         - title
 *         - description
 *         - priority
 *         - steps
 *         - outcome
 *       properties:
 *         playbook_id:
 *           type: string
 *           description: Unique playbook identifier
 *         title:
 *           type: string
 *           description: Playbook title
 *         description:
 *           type: string
 *           description: Playbook description
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Critical]
 *           description: Priority level
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: List of tags
 *         usage:
 *           type: string
 *           description: Usage statistics
 *         confidence:
 *           type: string
 *           description: Confidence percentage
 *         steps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Step'
 *           description: List of steps
 *         outcome:
 *           type: string
 *           description: Expected final outcome
 *         created_by:
 *           type: string
 *           description: Creator user ID
 *         is_active:
 *           type: boolean
 *           description: Whether playbook is active
 *   
 *   tags:
 *     - name: Playbooks
 *       description: Playbook management operations
 */

// GET /api/v1/playbooks - Get all playbooks
router.get('/', playbookController.getAllPlaybooks);

// GET /api/v1/playbooks/stats - Get playbook statistics
router.get('/stats', playbookController.getPlaybookStats);

// GET /api/v1/playbooks/search - Search playbooks
router.get('/search', playbookController.searchPlaybooks);

// GET /api/v1/playbooks/:id - Get playbook by ID
router.get('/:id', playbookController.getPlaybookById);

// POST /api/v1/playbooks - Create new playbook
router.post('/', playbookController.createPlaybook);

// PUT /api/v1/playbooks/:id - Update playbook
router.put('/:id', playbookController.updatePlaybook);

// DELETE /api/v1/playbooks/:id - Delete playbook
router.delete('/:id', playbookController.deletePlaybook);

// POST /api/v1/playbooks/:playbookId/increment-usage - Increment usage count
router.post('/:playbookId/increment-usage', playbookController.incrementUsage);

module.exports = router;
