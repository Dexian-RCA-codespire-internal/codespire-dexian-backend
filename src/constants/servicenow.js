/**
 * ServiceNow Constants
 * Contains all ServiceNow-related constants used throughout the application
 */

/**
 * Close codes for ticket resolution
 * These codes indicate how a ticket was resolved
 */
const CLOSE_CODES = {
  DUPLICATE: 'Duplicate',
  KNOWN_ERROR: 'Known error',
  NO_RESOLUTION_PROVIDED: 'No resolution provided',
  RESOLVED_BY_CALLER: 'Resolved by caller',
  RESOLVED_BY_CHANGE: 'Resolved by change',
  RESOLVED_BY_PROBLEM: 'Resolved by problem',
  RESOLVED_BY_REQUEST: 'Resolved by request',
  SOLUTION_PROVIDED: 'Solution provided',
  WORKAROUND_PROVIDED: 'Workaround provided',
  USER_ERROR: 'User error'
};

/**
 * Close code descriptions
 * Human-readable descriptions for each close code
 */
const CLOSE_CODE_DESCRIPTIONS = {
  [CLOSE_CODES.DUPLICATE]: 'Issue is a duplicate of another ticket',
  [CLOSE_CODES.KNOWN_ERROR]: 'Issue is a known problem with existing documentation',
  [CLOSE_CODES.NO_RESOLUTION_PROVIDED]: 'No solution was found or provided',
  [CLOSE_CODES.RESOLVED_BY_CALLER]: 'Issue was resolved by the caller themselves',
  [CLOSE_CODES.RESOLVED_BY_CHANGE]: 'Issue was resolved by implementing a change',
  [CLOSE_CODES.RESOLVED_BY_PROBLEM]: 'Issue was resolved by fixing an underlying problem',
  [CLOSE_CODES.RESOLVED_BY_REQUEST]: 'Issue was resolved by fulfilling a request',
  [CLOSE_CODES.SOLUTION_PROVIDED]: 'A solution was provided to resolve the issue',
  [CLOSE_CODES.WORKAROUND_PROVIDED]: 'A workaround was provided to resolve the issue',
  [CLOSE_CODES.USER_ERROR]: 'Issue was caused by user error'
};

/**
 * Array of all close codes for validation and iteration
 */
const CLOSE_CODE_LIST = Object.values(CLOSE_CODES);

/**
 * Ticket statuses
 */
const TICKET_STATUSES = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled'
};

/**
 * Ticket priorities
 */
const TICKET_PRIORITIES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

/**
 * Ticket sources
 */
const TICKET_SOURCES = {
  SERVICENOW: 'ServiceNow',
  JIRA: 'Jira',
  REMEDY: 'Remedy',
  OTHER: 'Other'
};

/**
 * Validation function to check if a close code is valid
 * @param {string} closeCode - The close code to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidCloseCode = (closeCode) => {
  return CLOSE_CODE_LIST.includes(closeCode);
};

/**
 * Get description for a close code
 * @param {string} closeCode - The close code
 * @returns {string} - Description of the close code
 */
const getCloseCodeDescription = (closeCode) => {
  return CLOSE_CODE_DESCRIPTIONS[closeCode] || 'Unknown close code';
};

/**
 * Get all close codes with their descriptions
 * @returns {Array} - Array of objects with code and description
 */
const getAllCloseCodesWithDescriptions = () => {
  return CLOSE_CODE_LIST.map(code => ({
    code,
    description: CLOSE_CODE_DESCRIPTIONS[code]
  }));
};

module.exports = {
  CLOSE_CODES,
  CLOSE_CODE_DESCRIPTIONS,
  CLOSE_CODE_LIST,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  isValidCloseCode,
  getCloseCodeDescription,
  getAllCloseCodesWithDescriptions
};
