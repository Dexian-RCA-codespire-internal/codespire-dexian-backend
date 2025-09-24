/**
 * SLA Controller
 * HTTP handlers for SLA-related operations
 */

const { fetchSLAs, getSLAByTicketId, getSLAStats, deleteSLAByTicketId } = require('../services/slaService');

/**
 * Fetch SLA records with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSLAs = async (req, res) => {
  try {
    console.log('🔍 SLA Controller - Received request:', {
      query: req.query,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
    
    const { 
      limit, 
      offset, 
      page, 
      priority, 
      status, 
      source,
      sortBy,
      sortOrder,
      assignedTo,
      startDate,
      endDate,
      searchTerm,
      slaStatus
    } = req.query;
    
    const options = {};
    
    // Handle limit parameter - default to 15
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (parsedLimit > 0) {
        options.limit = parsedLimit;
      }
    } else {
      options.limit = 15; // Default to 15 items per page
    }
    
    // Handle pagination - either offset or page
    if (offset) {
      options.offset = parseInt(offset);
    } else if (page) {
      options.page = parseInt(page);
    }
    
    // Handle other parameters
    if (priority) options.priority = priority;
    if (status) options.status = status;
    if (source) options.source = source;
    if (sortBy) options.sortBy = sortBy;
    if (sortOrder) options.sortOrder = sortOrder;
    if (assignedTo) options.assignedTo = assignedTo;
    if (searchTerm) options.searchTerm = searchTerm;
    if (slaStatus) options.slaStatus = slaStatus;
    
    // Handle date range
    if (startDate || endDate) {
      options.dateRange = {};
      if (startDate) options.dateRange.startDate = startDate;
      if (endDate) options.dateRange.endDate = endDate;
    }
    
    console.log('📋 SLA Controller - Processed options:', options);
    
    const result = await fetchSLAs(options);
    
    console.log('📊 SLA Controller - Service result:', {
      success: result.success,
      dataLength: result.data?.slas?.length || 0,
      pagination: result.data?.pagination,
      error: result.error
    });
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'SLA records fetched successfully',
        ...result.data
      });
    } else {
      console.error('❌ SLA Controller - Service error:', result.error);
      res.status(500).json({
        success: false,
        message: result.error,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ SLA Controller - Exception:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get SLA record by ticket ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSLAByTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { source } = req.query;
    
    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required'
      });
    }
    
    const result = await getSLAByTicketId(ticketId, source);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'SLA record fetched successfully',
        data: result.data
      });
    } else {
      const statusCode = result.error === 'SLA record not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.error,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching SLA record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get SLA statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSLAStatistics = async (req, res) => {
  try {
    const result = await getSLAStats();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'SLA statistics fetched successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching SLA statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete SLA record by ticket ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSLA = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { source } = req.query;
    
    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required'
      });
    }
    
    const result = await deleteSLAByTicketId(ticketId, source);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      const statusCode = result.error === 'SLA record not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.error,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error deleting SLA record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getSLAs,
  getSLAByTicket,
  getSLAStatistics,
  deleteSLA
};