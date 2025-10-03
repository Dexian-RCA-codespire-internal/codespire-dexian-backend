// new file servicenow
const express = require('express');
const router = express.Router();
const playbookController = require('../controllers/playbookController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes (commented out for testing)
// router.use(authenticateToken);

// GET /api/v1/playbooks - Get all playbooks
router.get('/', playbookController.getAllPlaybooks);

// GET /api/v1/playbooks/stats - Get playbook statistics
router.get('/stats', playbookController.getPlaybookStats);

// GET /api/v1/playbooks/search - Search playbooks (text search)
router.get('/search', playbookController.searchPlaybooks);

// GET /api/v1/playbooks/search/vector - Search playbooks using vector similarity
router.get('/search/vector', playbookController.searchPlaybooksByVector);

// GET /api/v1/playbooks/search/hybrid - Hybrid search combining text and vector similarity
router.get('/search/hybrid', playbookController.hybridSearchPlaybooks);

// GET /api/v1/playbooks/vectorization/health - Get vectorization service health
router.get('/vectorization/health', playbookController.getVectorizationHealth);

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