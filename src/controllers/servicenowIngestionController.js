// new file servicenow
const { fetchTickets } = require('../services/servicenowIngestionService');

/**
 * Fetch tickets from ServiceNow
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchTicketsHandler = async (req, res) => {
  try {
    const { limit, query, fields } = req.query;
    
    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (query) options.query = query;
    if (fields) options.fields = fields;

    const result = await fetchTickets(options);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Tickets fetched successfully. Total: ${result.total} tickets`,
        data: result.data,
        total: result.total
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  fetchTicketsHandler
};