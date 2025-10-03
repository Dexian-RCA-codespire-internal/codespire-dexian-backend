/**
 * Timeline Context Validators
 * Validation functions for timeline context generation requests
 */

const config = require('../agents/timeline-context/config');

/**
 * Validate timeline context generation request
 */
const validateTimelineContextGeneration = (req, res, next) => {
    try {
        const { problemStatement, ticketCreationTime, logs } = req.body;

        const errors = [];

        // Check required fields
        if (!problemStatement || typeof problemStatement !== 'string') {
            errors.push('problemStatement is required and must be a string');
        }

        if (!ticketCreationTime || typeof ticketCreationTime !== 'string') {
            errors.push('ticketCreationTime is required and must be a string');
        }

        // Validate problem statement length
        if (problemStatement && problemStatement.length > config.validation.maxProblemStatementLength) {
            errors.push(`problemStatement must not exceed ${config.validation.maxProblemStatementLength} characters`);
        }

        // Validate ticket creation time format
        if (ticketCreationTime) {
            const date = new Date(ticketCreationTime);
            if (isNaN(date.getTime())) {
                errors.push('ticketCreationTime must be a valid ISO date string');
            }
        }

        // Validate logs
        if (logs) {
            if (!Array.isArray(logs)) {
                errors.push('logs must be an array if provided');
            } else {
                if (logs.length > config.timeline.maxLogEntries) {
                    errors.push(`logs must not exceed ${config.timeline.maxLogEntries} entries`);
                }

                // Validate each log entry
                logs.forEach((log, index) => {
                    if (!log.time || !log.service || !log.level || !log.message) {
                        errors.push(`logs[${index}] must have time, service, level, and message properties`);
                    }

                    if (log.level && !config.validation.allowedLogLevels.includes(log.level)) {
                        errors.push(`logs[${index}].level must be one of: ${config.validation.allowedLogLevels.join(', ')}`);
                    }

                    if (log.message && log.message.length > config.validation.maxLogMessageLength) {
                        errors.push(`logs[${index}].message must not exceed ${config.validation.maxLogMessageLength} characters`);
                    }

                    // Validate log time format
                    if (log.time) {
                        const logDate = new Date(log.time);
                        if (isNaN(logDate.getTime())) {
                            errors.push(`logs[${index}].time must be a valid ISO date string`);
                        }
                    }
                });
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        next();
    } catch (error) {
        console.error('❌ Error in validateTimelineContextGeneration:', error);
        res.status(500).json({
            success: false,
            error: 'Validation error',
            message: error.message
        });
    }
};

/**
 * Validate request size
 */
const validateRequestSize = (req, res, next) => {
    try {
        const contentLength = req.get('content-length');
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (contentLength && parseInt(contentLength) > maxSize) {
            return res.status(413).json({
                success: false,
                error: 'Request too large',
                message: 'Request size exceeds maximum allowed size of 5MB'
            });
        }

        next();
    } catch (error) {
        console.error('❌ Error in validateRequestSize:', error);
        res.status(500).json({
            success: false,
            error: 'Request size validation error',
            message: error.message
        });
    }
};

/**
 * Validate rate limit (basic implementation)
 */
const validateRateLimit = (req, res, next) => {
    try {
        // Basic rate limiting - can be enhanced with Redis or other rate limiting solutions
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxRequests = 10; // 10 requests per minute

        // Simple in-memory rate limiting (for production, use Redis)
        if (!global.rateLimitStore) {
            global.rateLimitStore = new Map();
        }

        const key = `timeline_context:${clientId}`;
        const requests = global.rateLimitStore.get(key) || [];

        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < windowMs);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                message: `Too many requests. Limit: ${maxRequests} requests per minute`
            });
        }

        // Add current request
        validRequests.push(now);
        global.rateLimitStore.set(key, validRequests);

        next();
    } catch (error) {
        console.error('❌ Error in validateRateLimit:', error);
        res.status(500).json({
            success: false,
            error: 'Rate limit validation error',
            message: error.message
        });
    }
};

/**
 * Validate logs structure
 */
const validateLogs = (req, res, next) => {
    try {
        const { logs } = req.body;

        if (!logs || !Array.isArray(logs)) {
            return next(); // Logs are optional
        }

        const errors = [];

        logs.forEach((log, index) => {
            if (!log.time || typeof log.time !== 'string') {
                errors.push(`logs[${index}].time is required and must be a string`);
            }

            if (!log.service || typeof log.service !== 'string') {
                errors.push(`logs[${index}].service is required and must be a string`);
            }

            if (!log.level || typeof log.level !== 'string') {
                errors.push(`logs[${index}].level is required and must be a string`);
            }

            if (!log.message || typeof log.message !== 'string') {
                errors.push(`logs[${index}].message is required and must be a string`);
            }

            // Validate log level
            if (log.level && !config.validation.allowedLogLevels.includes(log.level)) {
                errors.push(`logs[${index}].level must be one of: ${config.validation.allowedLogLevels.join(', ')}`);
            }

            // Validate message length
            if (log.message && log.message.length > config.validation.maxLogMessageLength) {
                errors.push(`logs[${index}].message must not exceed ${config.validation.maxLogMessageLength} characters`);
            }

            // Validate time format
            if (log.time) {
                const logDate = new Date(log.time);
                if (isNaN(logDate.getTime())) {
                    errors.push(`logs[${index}].time must be a valid ISO date string`);
                }
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Logs validation failed',
                details: errors
            });
        }

        next();
    } catch (error) {
        console.error('❌ Error in validateLogs:', error);
        res.status(500).json({
            success: false,
            error: 'Logs validation error',
            message: error.message
        });
    }
};

module.exports = {
    validateTimelineContextGeneration,
    validateRequestSize,
    validateRateLimit,
    validateLogs
};
