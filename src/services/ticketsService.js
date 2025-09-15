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
    
    const stats = await Ticket.aggregate([
      { $match: { source: source } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                { $nin: ['$status', ['Closed', 'Resolved', 'Cancelled']] },
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
          },
          byPriority: {
            $push: {
              priority: '$priority',
              status: '$status'
            }
          },
          byCategory: {
            $push: {
              category: '$category',
              status: '$status'
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        success: true,
        message: 'No tickets found',
        data: {
          total: 0,
          open: 0,
          closed: 0,
          byPriority: {},
          byCategory: {}
        }
      };
    }

    const result = stats[0];
    
    // Calculate priority breakdown
    const priorityBreakdown = {};
    result.byPriority.forEach(item => {
      if (item.priority) {
        if (!priorityBreakdown[item.priority]) {
          priorityBreakdown[item.priority] = { total: 0, open: 0, closed: 0 };
        }
        priorityBreakdown[item.priority].total++;
        if (['Closed', 'Resolved', 'Cancelled'].includes(item.status)) {
          priorityBreakdown[item.priority].closed++;
        } else {
          priorityBreakdown[item.priority].open++;
        }
      }
    });

    // Calculate category breakdown
    const categoryBreakdown = {};
    result.byCategory.forEach(item => {
      if (item.category) {
        if (!categoryBreakdown[item.category]) {
          categoryBreakdown[item.category] = { total: 0, open: 0, closed: 0 };
        }
        categoryBreakdown[item.category].total++;
        if (['Closed', 'Resolved', 'Cancelled'].includes(item.status)) {
          categoryBreakdown[item.category].closed++;
        } else {
          categoryBreakdown[item.category].open++;
        }
      }
    });

    console.log(`✅ Statistics calculated: ${result.total} total tickets`);

    return {
      success: true,
      message: 'Statistics calculated successfully',
      data: {
        total: result.total,
        open: result.open,
        closed: result.closed,
        byPriority: priorityBreakdown,
        byCategory: categoryBreakdown
      }
    };

  } catch (error) {
    console.error('❌ Error calculating statistics:', error.message);
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
  getTicketStats
};
