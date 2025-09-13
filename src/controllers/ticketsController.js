// new file servicenow
const { fetchTicketsFromDB, getTicketById, getTicketStats } = require('../services/ticketsService');

/**
 * Fetch tickets from MongoDB database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTickets = async (req, res) => {
  try {
    const { 
      limit, 
      offset, 
      page, 
      query, 
      status, 
      priority, 
      category, 
      source,
      sortBy,
      sortOrder 
    } = req.query;
    
    const options = {};
    
    // Handle limit parameter
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (parsedLimit > 0) {
        options.limit = parsedLimit;
      }
    }
    
    // Handle pagination - either offset or page
    if (offset) {
      options.offset = parseInt(offset);
    } else if (page) {
      options.page = parseInt(page);
    }
    
    // Handle other parameters
    if (query) options.query = query;
    if (status) options.status = status;
    if (priority) options.priority = priority;
    if (category) options.category = category;
    if (source) options.source = source;
    if (sortBy) options.sortBy = sortBy;
    if (sortOrder) options.sortOrder = sortOrder;

    const result = await fetchTicketsFromDB(options);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        total: result.total,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets from database',
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

/**
 * Get a single ticket by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { source } = req.query;
    
    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required'
      });
    }

    const result = await getTicketById(ticketId, source);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      const statusCode = result.error === 'Ticket not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.error,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get ticket statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTicketStatistics = async (req, res) => {
  try {
    const { source } = req.query;
    
    const result = await getTicketStats(source);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket statistics',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching ticket statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getTickets,
  getTicket,
  getTicketStatistics
};
