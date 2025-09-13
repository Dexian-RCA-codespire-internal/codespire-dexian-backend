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

module.exports = {
    validateSimilarTicketsRequest
};
