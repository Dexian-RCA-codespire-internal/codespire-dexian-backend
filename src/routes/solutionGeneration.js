/**
 * Solution Generation Routes
 * API endpoints for solution generation functionality
 */

const express = require('express');
const router = express.Router();
const solutionGenerationController = require('../controllers/solutionGenerationController');

router.post('/generate', solutionGenerationController.generateSolutions);

router.get('/capabilities', solutionGenerationController.getCapabilities);

router.get('/health', solutionGenerationController.healthCheck);

router.post('/validate', solutionGenerationController.validateInput);

router.get('/templates', solutionGenerationController.getTemplates);

module.exports = router;