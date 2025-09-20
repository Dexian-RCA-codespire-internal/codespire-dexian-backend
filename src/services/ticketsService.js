// new file servicenow
const Ticket = require('../models/Tickets');
const { notificationService } = require('./notificationService');

/**
 * Fetch tickets from MongoDB database
 * @param {Object} options - Query options
 * @returns {Object} Result object with tickets data
 */
const fetchTicketsFromDB = async (options = {}) => {
  try {
    console.log('📥 Fetching tickets from MongoDB...');
    
    const {
      limit = 10,
      offset = 0,
      page,
      query = '',
      status,
      priority,
      category,
      source = 'ServiceNow',
      sortBy = 'opened_time',
      sortOrder = 'desc',
      // New filter parameters
      sources = [],
      priorities = [],
      dateRange = { startDate: '', endDate: '' },
      stages = []
    } = options;

    // Calculate offset from page if provided
    let calculatedOffset = offset;
    if (page) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      calculatedOffset = (pageNum - 1) * limitNum;
    }

    // Build query filter
    const filter = {};
    
    // Add source filter - handle both single source and multiple sources
    if (sources && sources.length > 0) {
      filter.source = { $in: sources };
    } else if (source) {
      filter.source = source;
    }

    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Add priority filter - handle both single priority and multiple priorities
    if (priorities && priorities.length > 0) {
      filter.priority = { $in: priorities };
    } else if (priority) {
      filter.priority = priority;
    }

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Add date range filter
    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      filter.createdAt = {};
      if (dateRange.startDate && dateRange.startDate.trim() !== '') {
        const startDate = new Date(dateRange.startDate + 'T00:00:00.000Z');
        filter.createdAt.$gte = startDate;
      }
      if (dateRange.endDate && dateRange.endDate.trim() !== '') {
        const endDate = new Date(dateRange.endDate + 'T23:59:59.999Z');
        filter.createdAt.$lte = endDate;
      }
      // If only startDate is provided, set endDate to startDate for "today" filtering
      if (dateRange.startDate && dateRange.startDate.trim() !== '' && (!dateRange.endDate || dateRange.endDate.trim() === '')) {
        const endDate = new Date(dateRange.startDate + 'T23:59:59.999Z');
        filter.createdAt.$lte = endDate;
      }
    }

    // Add stages filter - convert RCA stages to MongoDB status values
    if (stages && stages.length > 0) {
      const statusValues = []
      
      stages.forEach(stage => {
        switch (stage) {
          case 'New':
            statusValues.push('New', 'Pending')
            break
          case 'Analysis':
            statusValues.push('In Progress', 'Assigned')
            break
          case 'Resolved':
            statusValues.push('Resolved', 'Closed')
            break
          case 'Closed/Cancelled':
            statusValues.push('Cancelled', 'Closed')
            break
        }
      })
      
      if (statusValues.length > 0) {
        filter.status = { $in: statusValues }
      }
    }

    // Add text search if query provided
    if (query) {
      filter.$or = [
        { ticket_id: { $regex: query, $options: 'i' } },
        { short_description: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { subcategory: { $regex: query, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log(`🔧 Query filter:`, JSON.stringify(filter, null, 2));
    console.log(`🔧 Sort:`, JSON.stringify(sort, null, 2));
    console.log(`🔧 Limit: ${limit}, Offset: ${calculatedOffset}`);

    // Execute query with pagination
    const tickets = await Ticket.find(filter)
      .sort(sort)
      .skip(calculatedOffset)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    // Get total count for pagination
    const totalCount = await Ticket.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = page || Math.floor(calculatedOffset / limit) + 1;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    console.log(`✅ Found ${tickets.length} tickets (Total: ${totalCount})`);

    return {
      success: true,
      message: 'Tickets fetched successfully from database',
      data: tickets,
      total: totalCount,
      pagination: {
        currentPage,
        totalPages,
        limit: parseInt(limit),
        offset: calculatedOffset,
        hasNextPage,
        hasPrevPage,
        totalCount
      }
    };

  } catch (error) {
    console.error('❌ Error fetching tickets from database:', error.message);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Get a single ticket by ID
 * @param {String} ticketId - Ticket ID
 * @param {String} source - Source (default: ServiceNow)
 * @returns {Object} Result object with ticket data
 */
const getTicketById = async (ticketId, source = 'ServiceNow') => {
  try {
    console.log(`📥 Fetching ticket ${ticketId} from MongoDB...`);
    
    let ticket = await Ticket.findOne({ 
      ticket_id: ticketId, 
      source: source 
    }).lean();
    if(!ticket || !ticket?._id){
      ticket = await Ticket.findById({_id: ticketId}).lean();
    }

    if (!ticket) {
      return {
        success: false,
        error: 'Ticket not found',
        data: null
      };
    }

    console.log(`✅ Found ticket: ${ticket.ticket_id}`);

    return {
      success: true,
      message: 'Ticket fetched successfully',
      data: ticket
    };

  } catch (error) {
    console.error(`❌ Error fetching ticket ${ticketId}:`, error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Get ticket statistics
 * @param {String} source - Source (default: ServiceNow)
 * @returns {Object} Result object with statistics
 */
const getTicketStats = async (source = 'ServiceNow') => {
  try {
    console.log('📊 Calculating ticket statistics...');
    
    // Use simple count queries instead of complex aggregation
    const total = await Ticket.countDocuments({ source: source });
    const open = await Ticket.countDocuments({ 
      source: source,
      status: { $nin: ['Closed', 'Resolved', 'Cancelled'] }
    });
    const closed = await Ticket.countDocuments({ 
      source: source,
      status: { $in: ['Closed', 'Resolved', 'Cancelled'] }
    });

    // Get priority breakdown using simple aggregation
    const priorityStats = await Ticket.aggregate([
      { $match: { source: source, priority: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$priority',
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                { $not: { $in: ['$status', ['Closed', 'Resolved', 'Cancelled']] } },
                1,
                0
              ]
            }
          },
          closed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Closed', 'Resolved', 'Cancelled']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get category breakdown using simple aggregation
    const categoryStats = await Ticket.aggregate([
      { $match: { source: source, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                { $not: { $in: ['$status', ['Closed', 'Resolved', 'Cancelled']] } },
                1,
                0
              ]
            }
          },
          closed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Closed', 'Resolved', 'Cancelled']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Convert arrays to objects
    const priorityBreakdown = {};
    priorityStats.forEach(stat => {
      priorityBreakdown[stat._id] = {
        total: stat.total,
        open: stat.open,
        closed: stat.closed
      };
    });

    const categoryBreakdown = {};
    categoryStats.forEach(stat => {
      categoryBreakdown[stat._id] = {
        total: stat.total,
        open: stat.open,
        closed: stat.closed
      };
    });

    console.log(`✅ Statistics calculated: ${total} total tickets (${open} open, ${closed} closed)`);

    return {
      success: true,
      message: 'Statistics calculated successfully',
      data: {
        total,
        open,
        closed,
        byPriority: priorityBreakdown,
        byCategory: categoryBreakdown
      }
    };

  } catch (error) {
    console.error('❌ Error calculating statistics:', error.message);
    
    // Return fallback statistics
    return {
      success: true,
      message: 'Statistics calculated with fallback method',
      data: {
        total: 0,
        open: 0,
        closed: 0,
        byPriority: {},
        byCategory: {}
      }
    };
  }
};

/**
 * Update a ticket by ID
 * @param {String} ticketId - MongoDB ObjectId (primary) or Ticket ID (fallback)
 * @param {Object} updateData - Data to update
 * @param {String} source - Source (default: ServiceNow)
 * @returns {Object} Result object with updated ticket data
 */
const updateTicketById = async (ticketId, updateData, source = 'ServiceNow') => {
  try {
    console.log(`📝 Updating ticket ${ticketId} in MongoDB...`);
    
    // First, try finding by MongoDB ObjectId (primary method)
    let ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      // Fallback: try finding by ticket_id and source
      ticket = await Ticket.findOne({ 
        ticket_id: ticketId, 
        source: source 
      });
    }

    if (!ticket) {
      return {
        success: false,
        error: 'Ticket not found',
        data: null
      };
    }

    // Capture previous status before update
    const previousStatus = ticket.status;
    
    // Remove fields that shouldn't be updated directly
    const { _id, ticket_id, source: ticketSource, createdAt, updatedAt, ...allowedUpdates } = updateData;
    
    // Update the ticket
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticket._id,
      { 
        ...allowedUpdates,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).lean();

    if (!updatedTicket) {
      return {
        success: false,
        error: 'Failed to update ticket',
        data: null
      };
    }

    // Persist notification for updated ticket
    try {
      if (previousStatus !== updatedTicket.status) {
        // Status changed
        await notificationService.createAndBroadcast({
          title: "Ticket status changed",
          message: `Ticket ${updatedTicket.ticket_id} status: ${previousStatus} → ${updatedTicket.status}`,
          type: "info",
          related: {
            ticketMongoId: updatedTicket._id,
            ticket_id: updatedTicket.ticket_id,
            eventType: "status_changed"
          }
        });
      } 

    } catch (notificationError) {
      console.error(`⚠️ Failed to create notification for ticket update:`, notificationError.message);
      // Don't fail the update if notification fails
    }

    console.log(`✅ Updated ticket: ${updatedTicket.ticket_id}`);

    return {
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket
    };

  } catch (error) {
    console.error(`❌ Error updating ticket ${ticketId}:`, error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

module.exports = {
  fetchTicketsFromDB,
  getTicketById,
  getTicketStats,
  updateTicketById
};
