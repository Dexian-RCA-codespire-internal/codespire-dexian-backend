/**
 * Auto-Suggestion Validators
 * Input validation middleware for auto-suggestion endpoints
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for suggestion generation
 */
const validateSuggestionGeneration = [
    body('currentText')
        .exists()
        .withMessage('currentText is required')
        .isString()
        .withMessage('currentText must be a string')
        .notEmpty()
        .withMessage('currentText cannot be empty')
        .isLength({ min: 1, max: 1000 })
        .withMessage('currentText must be between 1 and 1000 characters'),
    
    body('reference')
        .optional()
        .isString()
        .withMessage('reference must be a string')
        .isLength({ max: 2000 })
        .withMessage('reference must not exceed 2000 characters'),
];

/**
 * Validation rules for multiple suggestions generation
 */
const validateMultipleSuggestions = [
    ...validateSuggestionGeneration,
    
    body('count')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined) {
                return true; // Allow null/undefined for dynamic count
            }
            if (!Number.isInteger(value) || value < 1 || value > 10) {
                throw new Error('count must be an integer between 1 and 10, or null for dynamic count');
            }
            return true;
        }),
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
 * Validate request body size
 */
const validateRequestSize = (req, res, next) => {
    const maxSize = 5 * 1024; // 5KB
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

/**
 * Rate limiting validation for suggestion requests
 */
const validateRateLimit = (req, res, next) => {
    // Simple rate limiting based on IP
    const clientIP = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // Max 100 requests per minute per IP
    
    // Initialize or get request tracking for this IP
    if (!global.suggestionRateLimit) {
        global.suggestionRateLimit = new Map();
    }
    
    const clientData = global.suggestionRateLimit.get(clientIP) || {
        requests: [],
        blocked: false
    };
    
    // Remove old requests outside the window
    clientData.requests = clientData.requests.filter(timestamp => 
        currentTime - timestamp < windowMs
    );
    
    // Check if client is rate limited
    if (clientData.requests.length >= maxRequests) {
        return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            details: `Maximum ${maxRequests} requests per minute allowed`
        });
    }
    
    // Add current request
    clientData.requests.push(currentTime);
    global.suggestionRateLimit.set(clientIP, clientData);
    
    next();
};

module.exports = {
    validateSuggestionGeneration: [...validateSuggestionGeneration, handleValidationErrors],
    validateMultipleSuggestions: [...validateMultipleSuggestions, handleValidationErrors],
    validateRequestSize,
    validateRateLimit,
    handleValidationErrors
};
