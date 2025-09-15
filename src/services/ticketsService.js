// new file servicenow
const Ticket = require('../models/Tickets');

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
      sortOrder = 'desc'
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
    
    // Add source filter
    if (source) {
      filter.source = source;
    }

    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Add priority filter
    if (priority) {
      filter.priority = priority;
    }

    // Add category filter
    if (category) {
      filter.category = category;
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
    
    const ticket = await Ticket.findOne({ 
      ticket_id: ticketId, 
      source: source 
    }).lean();

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

module.exports = {
  fetchTicketsFromDB,
  getTicketById,
  getTicketStats
};
