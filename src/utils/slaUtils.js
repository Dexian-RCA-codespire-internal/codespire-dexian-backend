/**
 * SLA Utilities
 * Helper functions for SLA processing and priority normalization
 */

/**
 * Convert UTC timestamp to Indian Standard Time (IST)
 * @param {Date} utcDate - UTC Date object
 * @returns {Date} Date converted to IST
 */
const convertToIST = (utcDate) => {
  if (!utcDate) return null;
  
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(utcDate.getTime() + istOffset);
};

/**
 * Normalizes ticket priority to SLA priority format
 * Maps ServiceNow priority values to P1, P2, P3 format
 * 
 * @param {string} ticketPriority - The original ticket priority
 * @returns {string} Normalized priority (P1, P2, or P3)
 */
const normalizePriority = (ticketPriority) => {
  if (!ticketPriority || typeof ticketPriority !== 'string') {
    return 'P3'; // Default to lowest priority
  }

  const priority = ticketPriority.toLowerCase();

  // P1 - Critical
  if (priority.includes('1') && priority.includes('critical')) {
    return 'P1';
  }
  if (priority === '1-critical') {
    return 'P1';
  }

  // P2 - High/Moderate
  if (priority.includes('2') && priority.includes('high')) {
    return 'P2';
  }
  if (priority.includes('3') && priority.includes('moderate')) {
    return 'P2';
  }
  if (priority === '2-high' || priority === '3-moderate') {
    return 'P2';
  }

  // P3 - Low/Planning
  if (priority.includes('4') && priority.includes('low')) {
    return 'P3';
  }
  if (priority.includes('5') && priority.includes('planning')) {
    return 'P3';
  }
  if (priority === '4-low' || priority === '5-planning') {
    return 'P3';
  }

  // Default fallback for any unmatched patterns
  return 'P3';
};

/**
 * Extracts SLA data from ticket object
 * 
 * @param {Object} ticket - The ticket object
 * @returns {Object} SLA data object
 */
const extractSLADataFromTicket = (ticket) => {
  if (!ticket) {
    throw new Error('Ticket object is required');
  }

  return {
    ticket_id: ticket.ticket_id,
    source: ticket.source || 'ServiceNow',
    category: ticket.category,
    status: ticket.status,
    priority: normalizePriority(ticket.priority),
    assigned_to: ticket.assigned_to || { id: null },
    opened_time: ticket.opened_time || new Date(), // Store in UTC format like tickets collection
    ticket_mongo_id: ticket._id
  };
};

/**
 * Validates SLA data structure
 * 
 * @param {Object} slaData - SLA data to validate
 * @returns {Object} Validation result with success flag and errors if any
 */
const validateSLAData = (slaData) => {
  const errors = [];

  if (!slaData.ticket_id) {
    errors.push('ticket_id is required');
  }

  if (!slaData.priority || !['P1', 'P2', 'P3'].includes(slaData.priority)) {
    errors.push('priority must be P1, P2, or P3');
  }

  if (!slaData.opened_time) {
    errors.push('opened_time is required');
  }

  if (!slaData.ticket_mongo_id) {
    errors.push('ticket_mongo_id is required');
  }

  return {
    success: errors.length === 0,
    errors: errors
  };
};

/**
 * Checks if SLA priority has changed and requires update
 * 
 * @param {Object} currentSLA - Current SLA record
 * @param {Object} newTicketData - New ticket data
 * @returns {boolean} True if priority has changed
 */
const isPriorityChanged = (currentSLA, newTicketData) => {
  if (!currentSLA || !newTicketData) {
    return false;
  }

  const newPriority = normalizePriority(newTicketData.priority);
  return currentSLA.priority !== newPriority;
};

module.exports = {
  convertToIST,
  normalizePriority,
  extractSLADataFromTicket,
  validateSLAData,
  isPriorityChanged
};