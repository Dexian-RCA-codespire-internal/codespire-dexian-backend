/**
 * Ticket Validation Rules
 * Validation middleware for ticket-related operations
 */

const { body } = require('express-validator');

/**
 * Validation rules for similar tickets request
 */
const validateSimilarTicketsRequest = [
    body('source')
        .notEmpty()
        .withMessage('Source is required')
        .isString()
        .withMessage('Source must be a string'),
    
    body('short_description')
        .notEmpty()
        .withMessage('Short description is required')
        .isString()
        .withMessage('Short description must be a string')
        .isLength({ min: 5, max: 500 })
        .withMessage('Short description must be between 5 and 500 characters'),
    
    body('description')
        .notEmpty()
        .withMessage('Description is required')
        .isString()
        .withMessage('Description must be a string')
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),
    
    body('category')
        .notEmpty()
        .withMessage('Category is required')
        .isString()
        .withMessage('Category must be a string'),
    
    body('ticket_id')
        .optional()
        .isString()
        .withMessage('Ticket ID must be a string')
];

/**
 * Validation rules for ticket suggestions request
 */
const validateTicketSuggestionsRequest = [
    body('similarTickets')
        .isArray({ min: 1, max: 10 })
        .withMessage('Similar tickets must be an array with 1-10 items'),
    
    body('similarTickets.*.ticket_id')
        .notEmpty()
        .withMessage('Each ticket must have a ticket_id')
        .isString()
        .withMessage('Ticket ID must be a string'),
    
    body('similarTickets.*.source')
        .notEmpty()
        .withMessage('Each ticket must have a source')
        .isString()
        .withMessage('Source must be a string'),
    
    body('similarTickets.*.short_description')
        .notEmpty()
        .withMessage('Each ticket must have a short_description')
        .isString()
        .withMessage('Short description must be a string'),
    
    body('similarTickets.*.description')
        .notEmpty()
        .withMessage('Each ticket must have a description')
        .isString()
        .withMessage('Description must be a string'),
    
    body('similarTickets.*.category')
        .notEmpty()
        .withMessage('Each ticket must have a category')
        .isString()
        .withMessage('Category must be a string'),
    
    body('similarTickets.*.confidence_score')
        .isFloat({ min: 0, max: 1 })
        .withMessage('Confidence score must be a number between 0 and 1'),
    
    // Current ticket validation (optional)
    body('currentTicket')
        .optional()
        .isObject()
        .withMessage('Current ticket must be an object'),
    
    body('currentTicket.ticket_id')
        .optional()
        .isString()
        .withMessage('Current ticket ID must be a string'),
    
    body('currentTicket.short_description')
        .optional()
        .isString()
        .withMessage('Current ticket short description must be a string'),
    
    body('currentTicket.description')
        .optional()
        .isString()
        .withMessage('Current ticket description must be a string'),
    
    body('currentTicket.category')
        .optional()
        .isString()
        .withMessage('Current ticket category must be a string'),
    
    // Options validation (optional)
    body('options')
        .optional()
        .isObject()
        .withMessage('Options must be an object'),
    
    body('options.skeleton')
        .optional()
        .isBoolean()
        .withMessage('Skeleton option must be a boolean')
];

module.exports = {
    validateSimilarTicketsRequest,
    validateTicketSuggestionsRequest
};
