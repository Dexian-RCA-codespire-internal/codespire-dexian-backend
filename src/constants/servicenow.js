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

/**
 * Issue types for problem statement generation
 */
const ISSUE_TYPES = {
  NETWORK: 'Network',
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  CONFIGURATION: 'Configuration',
  USER_ERROR: 'User Error',
  OTHER: 'Other'
};

/**
 * Severity levels for problem statement generation
 */
const SEVERITY_LEVELS = {
  SEV_1_CRITICAL: 'Sev 1 – Critical',
  SEV_2_MAJOR: 'Sev 2 – Major',
  SEV_3_MODERATE: 'Sev 3 – Moderate',
  SEV_4_MINOR: 'Sev 4 – Minor'
};

/**
 * Business impact categories for problem statement generation
 */
const BUSINESS_IMPACT_CATEGORIES = {
  REVENUE_LOSS: 'Revenue Loss',
  COMPLIANCE_ISSUE: 'Compliance Issue',
  OPERATIONAL_DOWNTIME: 'Operational Downtime',
  CUSTOMER_SUPPORT: 'Customer Support',
  OTHER: 'Other'
};

/**
 * Array of all issue types for validation
 */
const ISSUE_TYPE_LIST = Object.values(ISSUE_TYPES);

/**
 * Array of all severity levels for validation
 */
const SEVERITY_LEVEL_LIST = Object.values(SEVERITY_LEVELS);

/**
 * Array of all business impact categories for validation
 */
const BUSINESS_IMPACT_CATEGORY_LIST = Object.values(BUSINESS_IMPACT_CATEGORIES);

/**
 * Validation function to check if an issue type is valid
 * @param {string} issueType - The issue type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidIssueType = (issueType) => {
  return ISSUE_TYPE_LIST.includes(issueType);
};

/**
 * Validation function to check if a severity level is valid
 * @param {string} severity - The severity level to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidSeverityLevel = (severity) => {
  return SEVERITY_LEVEL_LIST.includes(severity);
};

/**
 * Validation function to check if a business impact category is valid
 * @param {string} businessImpact - The business impact category to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidBusinessImpactCategory = (businessImpact) => {
  return BUSINESS_IMPACT_CATEGORY_LIST.includes(businessImpact);
};

/**
 * Get all issue types with their descriptions
 * @returns {Array} - Array of objects with type and description
 */
const getAllIssueTypes = () => {
  return ISSUE_TYPE_LIST.map(type => ({
    type,
    description: `Issue related to ${type.toLowerCase()}`
  }));
};

/**
 * Get all severity levels with their descriptions
 * @returns {Array} - Array of objects with level and description
 */
const getAllSeverityLevels = () => {
  return SEVERITY_LEVEL_LIST.map(level => ({
    level,
    description: `Severity level: ${level}`
  }));
};

/**
 * Get all business impact categories with their descriptions
 * @returns {Array} - Array of objects with category and description
 */
const getAllBusinessImpactCategories = () => {
  return BUSINESS_IMPACT_CATEGORY_LIST.map(category => ({
    category,
    description: `Business impact: ${category}`
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
  getAllCloseCodesWithDescriptions,
  ISSUE_TYPES,
  SEVERITY_LEVELS,
  BUSINESS_IMPACT_CATEGORIES,
  ISSUE_TYPE_LIST,
  SEVERITY_LEVEL_LIST,
  BUSINESS_IMPACT_CATEGORY_LIST,
  isValidIssueType,
  isValidSeverityLevel,
  isValidBusinessImpactCategory,
  getAllIssueTypes,
  getAllSeverityLevels,
  getAllBusinessImpactCategories
};
