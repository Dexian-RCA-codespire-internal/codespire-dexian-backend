/**
 * SLA Service
 * Business logic for SLA management and processing
 */

const SLA = require('../models/SLA');
const { extractSLADataFromTicket, validateSLAData, isPriorityChanged } = require('../utils/slaUtils');

/**
 * Create or update SLA record for a ticket
 * @param {Object} ticket - The ticket object
 * @returns {Object} Result object with success flag and SLA data
 */
const createOrUpdateSLA = async (ticket) => {
  try {
    console.log(`📊 Processing SLA for ticket: ${ticket.ticket_id}`);

    // Extract SLA data from ticket
    const slaData = extractSLADataFromTicket(ticket);

    // Validate SLA data
    const validation = validateSLAData(slaData);
    if (!validation.success) {
      return {
        success: false,
        error: `SLA validation failed: ${validation.errors.join(', ')}`,
        data: null
      };
    }

    // Check if SLA record already exists
    const existingSLA = await SLA.findByTicketId(ticket.ticket_id, ticket.source);

    if (existingSLA) {
      // Update existing SLA record
      const updatedSLA = await SLA.findByIdAndUpdate(
        existingSLA._id,
        {
          category: slaData.category,
          status: slaData.status,
          priority: slaData.priority,
          assigned_to: slaData.assigned_to,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      console.log(`✅ Updated SLA record for ticket: ${ticket.ticket_id}`);
      return {
        success: true,
        message: 'SLA record updated successfully',
        data: updatedSLA,
        isNew: false
      };
    } else {
      // Create new SLA record
      const newSLA = new SLA(slaData);
      const savedSLA = await newSLA.save();

      console.log(`✅ Created SLA record for ticket: ${ticket.ticket_id}`);
      return {
        success: true,
        message: 'SLA record created successfully',
        data: savedSLA,
        isNew: true
      };
    }

  } catch (error) {
    console.error(`❌ Error processing SLA for ticket ${ticket.ticket_id}:`, error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Convert UTC timestamp to Indian Standard Time (IST)
 * @param {Date|string|Object} utcDate - UTC Date object, ISO string, or MongoDB date object
 * @returns {Date} Date converted to IST
 */
const convertToIST = (utcDate) => {
  if (!utcDate) return null;
  
  let dateObj;
  
  // Handle MongoDB date object format: { "$date": "2025-09-15T15:41:40.000Z" }
  if (typeof utcDate === 'object' && utcDate.$date) {
    dateObj = new Date(utcDate.$date);
  } 
  // Handle regular Date object or ISO string
  else {
    dateObj = new Date(utcDate);
  }
  
  // Validate the date
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date provided to convertToIST:', utcDate);
    return null;
  }
  
  // Create a proper IST date using toLocaleString
  // This approach is more reliable than manual offset calculation
  const istString = dateObj.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the IST string back to a Date object
  const istDate = new Date(istString);
  return istDate;
};

/**
 * Calculate SLA metrics for collection
 * @param {Array} slas - Array of SLA records with UTC time
 * @returns {Object} Metrics object
 */
const calculateCollectionMetrics = (slas) => {
  const metrics = {
    totalTickets: slas.length,
    breached: 0,
    critical: 0,
    warning: 0,
    safe: 0,
    completed: 0
  };

  slas.forEach(sla => {
    // Calculate SLA status for each ticket
    const slaStatus = calculateSLAStatus(
      sla.opened_time, // Now stored in UTC, no conversion needed
      sla.priority,
      sla.status
    );

    switch (slaStatus) {
      case 'breached':
        metrics.breached++;
        break;
      case 'critical':
        metrics.critical++;
        break;
      case 'warning':
        metrics.warning++;
        break;
      case 'safe':
        metrics.safe++;
        break;
      case 'completed':
        metrics.completed++;
        break;
    }
  });

  return metrics;
};

/**
 * Calculate SLA status based on time and priority (matching frontend logic)
 * @param {Date|string|Object} openedTime - When ticket was opened (UTC, can be MongoDB date object)
 * @param {String} priority - Ticket priority
 * @param {String} status - Ticket status
 * @returns {String} SLA status
 */
const calculateSLAStatus = (openedTime, priority, status) => {
  if (!openedTime) return 'unknown';

  // If ticket is closed/resolved, mark as completed
  const closedStatuses = ['closed', 'resolved', 'completed', 'cancelled'];
  if (closedStatuses.includes(status?.toLowerCase())) {
    return 'completed';
  }

  // SLA targets based on priority (in hours)
  const slaTargets = {
    'P1': 4,
    'P2': 12,
    'P3': 24,
    'P1 - Critical': 4,
    'P2 - High': 12,
    'P3 - Medium': 24,
    'P4 - Low': 24,
    'Critical': 4,
    'High': 12,
    'Medium': 24,
    'Low': 24,
    '1': 4,
    '2': 12,
    '3': 24,
    '4': 24
  };

  const targetHours = slaTargets[priority] || 24; // Default 24 hours (P3)
  
  // Parse the opened time properly
  let openedDate;
  if (typeof openedTime === 'object' && openedTime.$date) {
    openedDate = new Date(openedTime.$date);
  } else {
    openedDate = new Date(openedTime);
  }
  
  if (isNaN(openedDate.getTime())) {
    console.error('Failed to parse opened time in calculateSLAStatus:', openedTime);
    return 'unknown';
  }
  
  const currentDate = new Date();
  
  // Calculate how much time has elapsed since ticket was opened (both in UTC)
  const timeElapsed = currentDate.getTime() - openedDate.getTime();
  const totalSLATimeMs = targetHours * 60 * 60 * 1000; // Total SLA time in milliseconds
  
  // Calculate percentage of time that has elapsed
  const timeElapsedPercentage = timeElapsed / totalSLATimeMs;

  // If time has passed, it's breached
  if (timeElapsedPercentage >= 1.0) {
    return 'breached';
  }

  // Determine status based on elapsed percentage
  // Safe: 0-20%, Warning: 20-60%, Critical: 60-100%, Breached: >100%
  if (timeElapsedPercentage <= 0.2) { // 0-20% time elapsed
    return 'safe';
  } else if (timeElapsedPercentage <= 0.6) { // 20-60% time elapsed
    return 'warning';
  } else { // 60-100% time elapsed
    return 'critical';
  }
};

/**
 * Fetch SLA records with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Result object with SLA data
 */
const fetchSLAs = async (options = {}) => {
  try {
    console.log('📥 Fetching SLA records from MongoDB...');

    const {
      limit = 15, // Default to 15 items per page
      offset = 0,
      page,
      priority,
      status,
      source,
      sortBy = 'opened_time',
      sortOrder = 'desc',
      assignedTo,
      dateRange = {},
      searchTerm = '',
      slaStatus = '' // Add SLA status filtering
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

    // Only filter by source if explicitly provided
    if (source && source !== 'All') {
      filter.source = source;
    }

    if (priority && priority !== 'All') {
      filter.priority = priority;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (assignedTo && assignedTo !== 'All') {
      filter['assigned_to.id'] = assignedTo;
    }

    // Search term filter (search in ticket_id, category, status)
    if (searchTerm && searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      filter.$or = [
        { ticket_id: searchRegex },
        { category: searchRegex },
        { status: searchRegex }
      ];
    }

    // Date range filter
    if (dateRange.startDate || dateRange.endDate) {
      filter.opened_time = {};
      if (dateRange.startDate) {
        filter.opened_time.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        filter.opened_time.$lte = new Date(dateRange.endDate);
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Handle SLA status filtering - requires special logic since it's calculated dynamically
    if (slaStatus && slaStatus !== 'All') {
      // For SLA status filtering, we need to fetch all records, calculate SLA status, then filter and paginate
      console.log(`🔍 SLA Status filtering requested: ${slaStatus}`);
      
      // Get all SLAs matching other filters
      const allSLAs = await SLA.find(filter)
        .populate('ticket_mongo_id', 'ticket_id short_description')
        .lean();

      // Convert to IST and calculate SLA status for each
      const allSLAsWithStatus = allSLAs.map(sla => ({
        ...sla,
        opened_time_ist: convertToIST(sla.opened_time), // Keep IST for display purposes
        opened_time_original: sla.opened_time,
        calculatedSLAStatus: calculateSLAStatus(
          sla.opened_time, // Use UTC time directly for calculation
          sla.priority,
          sla.status
        )
      }));

      // Filter by SLA status
      const filteredBySLAStatus = allSLAsWithStatus.filter(sla => 
        sla.calculatedSLAStatus === slaStatus
      );

      // Apply sorting
      const sortKey = sortBy === 'opened_time' ? 'opened_time_ist' : sortBy;
      const sortMultiplier = sortOrder === 'desc' ? -1 : 1;
      filteredBySLAStatus.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return -1 * sortMultiplier;
        if (aVal > bVal) return 1 * sortMultiplier;
        return 0;
      });

      // Apply pagination
      const totalFilteredCount = filteredBySLAStatus.length;
      const paginatedSLAs = filteredBySLAStatus.slice(calculatedOffset, calculatedOffset + parseInt(limit));

      // Calculate metrics from all SLAs (not just filtered ones)
      const metrics = calculateCollectionMetrics(allSLAsWithStatus);

      console.log(`✅ SLA Status filtering complete: ${paginatedSLAs.length} records (${totalFilteredCount} total matching SLA status)`);

      return {
        success: true,
        data: {
          slas: paginatedSLAs,
          metrics: metrics,
          pagination: {
            total: totalFilteredCount,
            limit: parseInt(limit),
            offset: calculatedOffset,
            page: page ? parseInt(page) : Math.floor(calculatedOffset / parseInt(limit)) + 1,
            totalPages: Math.ceil(totalFilteredCount / parseInt(limit)),
            hasNextPage: calculatedOffset + parseInt(limit) < totalFilteredCount,
            hasPrevPage: calculatedOffset > 0
          }
        }
      };
    }

    // Normal processing without SLA status filtering
    // Execute queries
    const [slas, totalCount, allSLAs] = await Promise.all([
      SLA.find(filter)
        .sort(sort)
        .skip(calculatedOffset)
        .limit(parseInt(limit))
        .populate('ticket_mongo_id', 'ticket_id short_description')
        .lean(),
      SLA.countDocuments(filter),
      // Fetch all SLAs for metrics calculation
      SLA.find(filter)
        .populate('ticket_mongo_id', 'ticket_id short_description')
        .lean()
    ]);

    // Convert opened_time to IST for current page SLAs and calculate SLA status for consistency
    const slasWithIST = slas.map(sla => ({
      ...sla,
      opened_time_ist: convertToIST(sla.opened_time),
      opened_time_original: sla.opened_time, // Keep original for reference
      calculatedSLAStatus: calculateSLAStatus(
        sla.opened_time, // Use UTC time directly for calculation
        sla.priority,
        sla.status
      )
    }));

    // Convert opened_time to IST for all SLAs and calculate metrics
    const allSLAsWithIST = allSLAs.map(sla => ({
      ...sla,
      opened_time_ist: convertToIST(sla.opened_time),
      opened_time_original: sla.opened_time,
      calculatedSLAStatus: calculateSLAStatus(
        sla.opened_time, // Use UTC time directly for calculation
        sla.priority,
        sla.status
      )
    }));

    // Calculate collection-wide metrics
    const metrics = calculateCollectionMetrics(allSLAsWithIST);

    console.log(`✅ Fetched ${slas.length} SLA records with IST conversion and collection metrics`);
    console.log(`📊 SLA Status distribution in current page:`, {
      safe: slasWithIST.filter(s => s.calculatedSLAStatus === 'safe').length,
      warning: slasWithIST.filter(s => s.calculatedSLAStatus === 'warning').length,
      critical: slasWithIST.filter(s => s.calculatedSLAStatus === 'critical').length,
      breached: slasWithIST.filter(s => s.calculatedSLAStatus === 'breached').length,
      completed: slasWithIST.filter(s => s.calculatedSLAStatus === 'completed').length
    });

    return {
      success: true,
      data: {
        slas: slasWithIST,
        metrics: metrics, // Add collection-wide metrics
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: calculatedOffset,
          page: page ? parseInt(page) : Math.floor(calculatedOffset / parseInt(limit)) + 1,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          hasNextPage: calculatedOffset + parseInt(limit) < totalCount,
          hasPrevPage: calculatedOffset > 0
        }
      }
    };

  } catch (error) {
    console.error('❌ Error fetching SLA records:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Get SLA record by ticket ID
 * @param {String} ticketId - Ticket ID
 * @param {String} source - Source system (default: ServiceNow)
 * @returns {Object} Result object with SLA data
 */
const getSLAByTicketId = async (ticketId, source = 'ServiceNow') => {
  try {
    console.log(`📋 Fetching SLA record for ticket: ${ticketId}`);

    const sla = await SLA.findByTicketId(ticketId, source)
      .populate('ticket_mongo_id', 'ticket_id short_description status priority')
      .lean();

    if (!sla) {
      return {
        success: false,
        error: 'SLA record not found',
        data: null
      };
    }

    console.log(`✅ Found SLA record for ticket: ${ticketId}`);
    return {
      success: true,
      data: sla
    };

  } catch (error) {
    console.error(`❌ Error fetching SLA for ticket ${ticketId}:`, error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Get SLA statistics
 * @returns {Object} Result object with SLA statistics
 */
const getSLAStats = async () => {
  try {
    console.log('📊 Calculating SLA statistics...');

    const [
      totalSLAs,
      priorityStats,
      statusStats,
      assigneeStats
    ] = await Promise.all([
      SLA.countDocuments(),
      SLA.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),
      SLA.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      SLA.aggregate([
        {
          $group: {
            _id: '$assigned_to.id',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const stats = {
      total: totalSLAs,
      byPriority: priorityStats.reduce((acc, stat) => {
        acc[stat._id || 'Unknown'] = stat.count;
        return acc;
      }, {}),
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id || 'Unknown'] = stat.count;
        return acc;
      }, {}),
      topAssignees: assigneeStats.filter(stat => stat._id).slice(0, 10)
    };

    console.log('✅ SLA statistics calculated');
    return {
      success: true,
      data: stats
    };

  } catch (error) {
    console.error('❌ Error calculating SLA statistics:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Delete SLA record by ticket ID
 * @param {String} ticketId - Ticket ID
 * @param {String} source - Source system (default: ServiceNow)
 * @returns {Object} Result object
 */
const deleteSLAByTicketId = async (ticketId, source = 'ServiceNow') => {
  try {
    console.log(`🗑️ Deleting SLA record for ticket: ${ticketId}`);

    const result = await SLA.findOneAndDelete({ ticket_id: ticketId, source: source });

    if (!result) {
      return {
        success: false,
        error: 'SLA record not found',
        data: null
      };
    }

    console.log(`✅ Deleted SLA record for ticket: ${ticketId}`);
    return {
      success: true,
      message: 'SLA record deleted successfully',
      data: result
    };

  } catch (error) {
    console.error(`❌ Error deleting SLA for ticket ${ticketId}:`, error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

module.exports = {
  createOrUpdateSLA,
  fetchSLAs,
  getSLAByTicketId,
  getSLAStats,
  deleteSLAByTicketId,
  convertToIST
};