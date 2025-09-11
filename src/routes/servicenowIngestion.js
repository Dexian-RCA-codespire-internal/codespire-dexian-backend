// new file servicenow
// new file servicenow
const express = require('express');
const router = express.Router();
const { fetchTicketsHandler } = require('../controllers/servicenowIngestionController');

// Single endpoint to fetch tickets from ServiceNow
router.get('/tickets', fetchTicketsHandler);

module.exports = router;
