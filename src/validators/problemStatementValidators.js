/**
 * Problem Statement Validators
 * Input validation middleware for problem statement endpoints
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for problem statement generation
 */
const validateProblemStatementGeneration = [
    body('shortDescription')
        .exists()
        .withMessage('shortDescription is required')
        .isString()
        .withMessage('shortDescription must be a string')
        .notEmpty()
        .withMessage('shortDescription cannot be empty')
        .isLength({ min: 1, max: 2000 })
        .withMessage('shortDescription must be between 1 and 2000 characters'),
    
    body('description')
        .optional()
        .isString()
        .withMessage('description must be a string')
        .isLength({ max: 2000 })
        .withMessage('description must not exceed 2000 characters'),
    
    body('serverLogs')
        .optional()
        .isArray()
        .withMessage('serverLogs must be an array')
        .custom((value) => {
            if (value && value.length > 100) {
                throw new Error('serverLogs must not exceed 100 entries');
            }
            return true;
        }),
    
    body('serverLogs.*.time')
        .optional()
        .isString()
        .withMessage('serverLogs time must be a string'),
    
    body('serverLogs.*.service')
        .optional()
        .isString()
        .withMessage('serverLogs service must be a string'),
    
    body('serverLogs.*.level')
        .optional()
        .isString()
        .withMessage('serverLogs level must be a string'),
    
    body('serverLogs.*.message')
        .optional()
        .isString()
        .withMessage('serverLogs message must be a string')
        .isLength({ max: 1000 })
        .withMessage('serverLogs message must not exceed 1000 characters')
];

/**
 * Validation rules for custom problem statement generation
 */
const validateCustomProblemStatementGeneration = [
    ...validateProblemStatementGeneration,
    
    body('options')
        .optional()
        .isObject()
        .withMessage('options must be an object'),
    
    body('options.temperature')
        .optional()
        .isFloat({ min: 0, max: 2 })
        .withMessage('options.temperature must be a number between 0 and 2'),
    
    body('options.maxTokens')
        .optional()
        .isInt({ min: 50, max: 1000 })
        .withMessage('options.maxTokens must be an integer between 50 and 1000'),
    
    body('options.timeout')
        .optional()
        .isInt({ min: 5000, max: 60000 })
        .withMessage('options.timeout must be an integer between 5000 and 60000 milliseconds')
];

/**
 * Validation rules for batch problem statement generation
 */
const validateBatchProblemStatementGeneration = [
    body('inputDataArray')
        .exists()
        .withMessage('inputDataArray is required')
        .isArray()
        .withMessage('inputDataArray must be an array')
        .isLength({ min: 1, max: 10 })
        .withMessage('inputDataArray must contain between 1 and 10 items'),
    
    body('inputDataArray.*.shortDescription')
        .exists()
        .withMessage('shortDescription is required for each input data')
        .isString()
        .withMessage('shortDescription must be a string')
        .notEmpty()
        .withMessage('shortDescription cannot be empty')
        .isLength({ min: 1, max: 2000 })
        .withMessage('shortDescription must be between 1 and 2000 characters'),
    
    body('inputDataArray.*.description')
        .optional()
        .isString()
        .withMessage('description must be a string')
        .isLength({ max: 2000 })
        .withMessage('description must not exceed 2000 characters'),
    
    body('inputDataArray.*.serverLogs')
        .optional()
        .isArray()
        .withMessage('serverLogs must be an array')
        .custom((value) => {
            if (value && value.length > 100) {
                throw new Error('serverLogs must not exceed 100 entries');
            }
            return true;
        })
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
    const maxSize = 50 * 1024; // 50KB (larger for server logs)
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
 * Rate limiting validation for problem statement requests
 */
const validateRateLimit = (req, res, next) => {
    // Simple rate limiting based on IP
    const clientIP = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 50; // Max 50 requests per minute per IP (lower for AI processing)
    
    // Initialize or get request tracking for this IP
    if (!global.problemStatementRateLimit) {
        global.problemStatementRateLimit = new Map();
    }
    
    const clientData = global.problemStatementRateLimit.get(clientIP) || {
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
    global.problemStatementRateLimit.set(clientIP, clientData);
    
    next();
};

/**
 * Validate server logs structure
 */
const validateServerLogs = (req, res, next) => {
    const { serverLogs } = req.body;
    
    if (serverLogs && Array.isArray(serverLogs)) {
        for (let i = 0; i < serverLogs.length; i++) {
            const log = serverLogs[i];
            if (!log.time || !log.service || !log.level || !log.message) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid server log structure',
                    details: `serverLogs[${i}] must have time, service, level, and message properties`
                });
            }
        }
    }
    
    next();
};

module.exports = {
    validateProblemStatementGeneration: [...validateProblemStatementGeneration, handleValidationErrors],
    validateCustomProblemStatementGeneration: [...validateCustomProblemStatementGeneration, handleValidationErrors],
    validateBatchProblemStatementGeneration: [...validateBatchProblemStatementGeneration, handleValidationErrors],
    validateRequestSize,
    validateRateLimit,
    validateServerLogs,
    handleValidationErrors
};

