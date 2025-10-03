/**
 * RCA Generation Validators
 * Input validation middleware for RCA generation endpoints
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for complete RCA generation
 */
const validateRCAGeneration = [
    // Validate ticket data
    body('ticketData')
        .exists()
        .withMessage('Ticket data is required')
        .isObject()
        .withMessage('Ticket data must be an object'),
    
    body('ticketData.ticket_id')
        .exists()
        .withMessage('Ticket ID is required')
        .isString()
        .withMessage('Ticket ID must be a string')
        .notEmpty()
        .withMessage('Ticket ID cannot be empty'),
    
    body('ticketData.short_description')
        .exists()
        .withMessage('Short description is required')
        .isString()
        .withMessage('Short description must be a string')
        .notEmpty()
        .withMessage('Short description cannot be empty'),
    
    body('ticketData.source')
        .optional()
        .isString()
        .withMessage('Source must be a string'),
    
    body('ticketData.category')
        .optional()
        .isString()
        .withMessage('Category must be a string'),
    
    body('ticketData.priority')
        .optional()
        .isString()
        .withMessage('Priority must be a string'),
    
    body('ticketData.impact')
        .optional()
        .isString()
        .withMessage('Impact must be a string'),
    
    // Validate RCA fields
    body('rcaFields')
        .exists()
        .withMessage('RCA fields are required')
        .isObject()
        .withMessage('RCA fields must be an object')    
];

/**
 * Validation rules for customer summary generation
 */
const validateCustomerSummaryGeneration = [
    body('technicalRCA')
        .exists()
        .withMessage('Technical RCA is required')
        .isString()
        .withMessage('Technical RCA must be a string')
        .notEmpty()
        .withMessage('Technical RCA cannot be empty'),
    
    body('ticketData')
        .exists()
        .withMessage('Ticket data is required')
        .isObject()
        .withMessage('Ticket data must be an object'),
    
    body('ticketData.short_description')
        .exists()
        .withMessage('Short description is required')
        .isString()
        .withMessage('Short description must be a string')
        .notEmpty()
        .withMessage('Short description cannot be empty'),
];

/**
 * Validation rules for streaming RCA generation
 */
const validateStreamingRCAGeneration = [
    ...validateRCAGeneration, // Include all standard RCA validation rules
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }));
        
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: formattedErrors
        });
    }
    
    next();
};

/**
 * Validate socket ID header for streaming endpoints
 */
const validateSocketId = (req, res, next) => {
    const socketId = req.headers['x-socket-id'];
    
    if (!socketId) {
        return res.status(400).json({
            success: false,
            error: 'Socket ID is required for streaming endpoints',
            details: 'Include x-socket-id header with your WebSocket connection ID'
        });
    }
    
    if (typeof socketId !== 'string' || socketId.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid socket ID',
            details: 'Socket ID must be a non-empty string'
        });
    }
    
    // Attach socket ID to request for controller use
    req.socketId = socketId.trim();
    
    next();
};

/**
 * Validate request body size
 */
const validateRequestSize = (req, res, next) => {
    const maxSize = 10 * 1024; // 10KB
    const bodySize = JSON.stringify(req.body).length;
    
    if (bodySize > maxSize) {
        return res.status(413).json({
            success: false,
            error: 'Request body too large',
            details: `Request body size (${bodySize} bytes) exceeds maximum allowed size (${maxSize} bytes)`
        });
    }
    
    next();
};

module.exports = {
    validateRCAGeneration: [...validateRCAGeneration, handleValidationErrors],
    validateCustomerSummaryGeneration: [...validateCustomerSummaryGeneration, handleValidationErrors],
    validateStreamingRCAGeneration: [...validateStreamingRCAGeneration, validateSocketId, handleValidationErrors],
    validateSocketId,
    validateRequestSize,
    handleValidationErrors
};
