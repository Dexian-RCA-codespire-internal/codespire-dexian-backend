/**
 * Ticket Resolution Validators
 * Validation rules for ticket resolution endpoints
 */

const { body, param, query } = require('express-validator');

/**
 * Validation rules for ticket resolution
 */
const validateTicketResolution = [

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
        .withMessage('Ticket _id must be a valid MongoDB ObjectId')
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
