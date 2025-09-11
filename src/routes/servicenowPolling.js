// new file servicenow
const express = require('express');
const router = express.Router();
const {
  getPollingStatus,
  startPolling,
  stopPolling,
  triggerManualPoll,
  resetPollingState
} = require('../controllers/servicenowPollingController');

// Get polling service status
router.get('/status', getPollingStatus);

// Start polling service
router.post('/start', startPolling);

// Stop polling service
router.post('/stop', stopPolling);

// Trigger manual poll
router.post('/poll', triggerManualPoll);

// Reset polling state (use with caution)
router.post('/reset', resetPollingState);

module.exports = router;
