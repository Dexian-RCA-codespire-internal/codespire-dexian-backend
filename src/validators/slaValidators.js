/**
 * SLA Validators
 * Validation rules for SLA operations
 */

const { param, query } = require('express-validator');

/**
 * Validation rules for SLA query parameters
 */
const validateSLAQuery = [
    // Pagination parameters
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100')
        .toInt(),

    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer')
        .toInt(),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    // Filter parameters
    query('priority')
        .optional()
        .isIn(['P1', 'P2', 'P3'])
        .withMessage('Priority must be one of: P1, P2, P3'),

    query('status')
        .optional()
        .isString()
        .withMessage('Status must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Status must be between 1 and 50 characters')
        .trim(),

    query('source')
        .optional()
        .isString()
        .withMessage('Source must be a string')
        .isIn(['ServiceNow', 'Jira', 'Remedy', 'Other'])
        .withMessage('Source must be one of: ServiceNow, Jira, Remedy, Other'),

    query('slaStatus')
        .optional()
        .isString()
        .withMessage('SLA Status must be a string')
        .isIn(['safe', 'warning', 'critical', 'breached', 'completed'])
        .withMessage('SLA Status must be one of: safe, warning, critical, breached, completed'),

    query('assignedTo')
        .optional()
        .isString()
        .withMessage('AssignedTo must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('AssignedTo must be between 1 and 100 characters')
        .trim(),

    // Sort parameters
    query('sortBy')
        .optional()
        .isIn(['opened_time', 'priority', 'status', 'ticket_id', 'createdAt', 'updatedAt'])
        .withMessage('SortBy must be one of: opened_time, priority, status, ticket_id, createdAt, updatedAt'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('SortOrder must be either asc or desc'),

    // Date range parameters
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('StartDate must be a valid ISO 8601 date')
        .toDate(),

    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('EndDate must be a valid ISO 8601 date')
        .toDate(),

    // Search parameters
    query('searchTerm')
        .optional()
        .isString()
        .withMessage('Search term must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Search term must be between 1 and 100 characters')
        .trim()
];

/**
 * Validation rules for ticket ID parameter
 */
const validateTicketIdParam = [
    param('ticketId')
        .notEmpty()
        .withMessage('Ticket ID is required')
        .isString()
        .withMessage('Ticket ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Ticket ID must be between 1 and 100 characters')
        .trim()
];

/**
 * Validation rules for source query parameter
 */
const validateSourceQuery = [
    query('source')
        .optional()
        .isString()
        .withMessage('Source must be a string')
        .isIn(['ServiceNow', 'Jira', 'Remedy', 'Other'])
        .withMessage('Source must be one of: ServiceNow, Jira, Remedy, Other')
        .trim()
];

/**
 * Combined validation for SLA by ticket ID
 */
const validateSLAByTicket = [
    ...validateTicketIdParam,
    ...validateSourceQuery
];

/**
 * Custom validation for date range consistency
 */
const validateDateRange = (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'StartDate must be before EndDate',
                error: 'Invalid date range'
            });
        }
    }
    
    next();
};

module.exports = {
    validateSLAQuery,
    validateTicketIdParam,
    validateSourceQuery,
    validateSLAByTicket,
    validateDateRange
};