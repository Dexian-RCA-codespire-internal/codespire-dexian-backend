/**
 * Ticket Resolution Validators
 * Validation rules for ticket resolution endpoints
 */

const { body, param, query } = require('express-validator');

/**
 * Validation rules for ticket resolution
 */
const validateTicketResolution = [
    // Root cause validation
    body('rootCause')
        .notEmpty()
        .withMessage('Root cause is required')
        .isString()
        .withMessage('Root cause must be a string')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Root cause must be between 10 and 2000 characters')
        .trim(),

    // Ticket validation
    body('ticket')
        .notEmpty()
        .withMessage('Ticket data is required')
        .isObject()
        .withMessage('Ticket must be an object'),

    // Required ticket fields
    body('ticket._id')
        .notEmpty()
        .withMessage('Ticket _id is required')
        .isMongoId()
        .withMessage('Ticket _id must be a valid MongoDB ObjectId'),

    body('ticket.ticket_id')
        .notEmpty()
        .withMessage('Ticket ID is required')
        .isString()
        .withMessage('Ticket ID must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Ticket ID must be between 1 and 100 characters')
        .trim(),

    body('ticket.source')
        .notEmpty()
        .withMessage('Ticket source is required')
        .isString()
        .withMessage('Ticket source must be a string')
        .isIn(['ServiceNow', 'Jira', 'Remedy', 'Other'])
        .withMessage('Ticket source must be one of: ServiceNow, Jira, Remedy, Other')
        .trim(),

    body('ticket.short_description')
        .notEmpty()
        .withMessage('Ticket short description is required')
        .isString()
        .withMessage('Ticket short description must be a string')
        .isLength({ min: 5, max: 500 })
        .withMessage('Ticket short description must be between 5 and 500 characters')
        .trim(),

    body('ticket.description')
        .optional()
        .isString()
        .withMessage('Ticket description must be a string')
        .isLength({ min: 0, max: 5000 })
        .withMessage('Ticket description must not exceed 5000 characters')
        .trim(),

    body('ticket.category')
        .notEmpty()
        .withMessage('Ticket category is required')
        .isString()
        .withMessage('Ticket category must be a string')
        .isLength({ min: 1, max: 200 })
        .withMessage('Ticket category must be between 1 and 200 characters')
        .trim(),

    body('ticket.priority')
        .optional()
        .isString()
        .withMessage('Ticket priority must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Ticket priority must be between 1 and 50 characters')
        .trim(),

    body('ticket.impact')
        .optional()
        .isString()
        .withMessage('Ticket impact must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Ticket impact must be between 1 and 50 characters')
        .trim(),

    body('ticket.urgency')
        .optional()
        .isString()
        .withMessage('Ticket urgency must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Ticket urgency must be between 1 and 50 characters')
        .trim(),

    // Raw data validation
    body('ticket.raw')
        .notEmpty()
        .withMessage('Ticket raw data is required')
        .isObject()
        .withMessage('Ticket raw data must be an object'),

    body('ticket.raw.sys_id')
        .notEmpty()
        .withMessage('Ticket sys_id is required')
        .isString()
        .withMessage('Ticket sys_id must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Ticket sys_id must be between 1 and 100 characters')
        .trim()
];


/**
 * Custom validation for ticket data structure
 */
const validateTicketStructure = (req, res, next) => {
    const { ticket } = req.body;
    
    if (!ticket) {
        return next();
    }
    
    // Check if required nested fields exist
    const requiredFields = ['_id', 'ticket_id', 'source', 'short_description', 'category', 'raw'];
    const missingFields = requiredFields.filter(field => !ticket[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Missing required ticket fields',
            missingFields
        });
    }
    
    // Check if raw.sys_id exists
    if (!ticket.raw || !ticket.raw.sys_id) {
        return res.status(400).json({
            success: false,
            message: 'Ticket raw.sys_id is required for ServiceNow updates'
        });
    }
    
    next();
};

module.exports = {
    validateTicketResolution,
    validateTicketStructure
};
