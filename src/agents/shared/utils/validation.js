/**
 * Validation Utilities
 * Functional utilities for input validation and sanitization
 */

/**
 * Validate required fields in an object
 * @param {Object} data - Data to validate
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Object} Validation result {isValid, errors}
 */
function validateRequiredFields(data, requiredFields) {
    const errors = [];
    
    for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            errors.push(`Field '${field}' is required`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate field types
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema with field types {fieldName: 'string'|'number'|'boolean'|'array'|'object'}
 * @returns {Object} Validation result {isValid, errors}
 */
function validateFieldTypes(data, schema) {
    const errors = [];
    
    for (const [field, expectedType] of Object.entries(schema)) {
        if (data[field] !== undefined && data[field] !== null) {
            const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
            
            if (actualType !== expectedType) {
                errors.push(`Field '${field}' must be of type '${expectedType}', got '${actualType}'`);
            }
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate string length constraints
 * @param {Object} data - Data to validate
 * @param {Object} constraints - Length constraints {fieldName: {min?: number, max?: number}}
 * @returns {Object} Validation result {isValid, errors}
 */
function validateStringLengths(data, constraints) {
    const errors = [];
    
    for (const [field, constraint] of Object.entries(constraints)) {
        const value = data[field];
        
        if (typeof value === 'string') {
            if (constraint.min && value.length < constraint.min) {
                errors.push(`Field '${field}' must be at least ${constraint.min} characters long`);
            }
            if (constraint.max && value.length > constraint.max) {
                errors.push(`Field '${field}' must be no more than ${constraint.max} characters long`);
            }
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate data against a complete schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Complete validation schema
 * @param {Array<string>} schema.required - Required fields
 * @param {Object} schema.types - Field types
 * @param {Object} schema.lengths - String length constraints
 * @param {Object} schema.custom - Custom validation functions {fieldName: (value) => {isValid, error}}
 * @returns {Object} Validation result {isValid, errors}
 */
function validateSchema(data, schema) {
    const allErrors = [];
    
    // Validate required fields
    if (schema.required) {
        const result = validateRequiredFields(data, schema.required);
        allErrors.push(...result.errors);
    }
    
    // Validate field types
    if (schema.types) {
        const result = validateFieldTypes(data, schema.types);
        allErrors.push(...result.errors);
    }
    
    // Validate string lengths
    if (schema.lengths) {
        const result = validateStringLengths(data, schema.lengths);
        allErrors.push(...result.errors);
    }
    
    // Apply custom validations
    if (schema.custom) {
        for (const [field, validator] of Object.entries(schema.custom)) {
            if (data[field] !== undefined) {
                const result = validator(data[field]);
                if (!result.isValid) {
                    allErrors.push(result.error || `Field '${field}' is invalid`);
                }
            }
        }
    }
    
    return {
        isValid: allErrors.length === 0,
        errors: allErrors
    };
}

/**
 * Sanitize and clean input data
 * @param {Object} data - Data to sanitize
 * @param {Array<string>} trimFields - Fields to trim whitespace
 * @param {Array<string>} removeFields - Fields to remove completely
 * @returns {Object} Sanitized data
 */
function sanitizeData(data, trimFields = [], removeFields = []) {
    const sanitized = { ...data };
    
    // Trim specified fields
    for (const field of trimFields) {
        if (typeof sanitized[field] === 'string') {
            sanitized[field] = sanitized[field].trim();
        }
    }
    
    // Remove specified fields
    for (const field of removeFields) {
        delete sanitized[field];
    }
    
    return sanitized;
}

/**
 * Create a validation schema for common RAG input patterns
 * @param {Object} options - Schema options
 * @param {Array<string>} options.requiredFields - Required fields
 * @param {Object} options.textFields - Text field constraints {fieldName: {min, max}}
 * @param {Array<string>} options.optionalFields - Optional fields
 * @returns {Object} Validation schema
 */
function createRAGInputSchema(options = {}) {
    const {
        requiredFields = ['source', 'short_description', 'description', 'category'],
        textFields = {
            short_description: { min: 5, max: 500 },
            description: { min: 10, max: 5000 }
        },
        optionalFields = ['ticket_id', 'subcategory', 'priority']
    } = options;
    
    const types = {};
    
    // Set all fields as string type
    [...requiredFields, ...optionalFields].forEach(field => {
        types[field] = 'string';
    });
    
    return {
        required: requiredFields,
        types: types,
        lengths: textFields
    };
}

/**
 * Common validation patterns for different data types
 */
const VALIDATION_PATTERNS = {
    email: (value) => ({
        isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        error: 'Invalid email format'
    }),
    
    url: (value) => ({
        isValid: /^https?:\/\/.+/.test(value),
        error: 'Invalid URL format'
    }),
    
    nonEmpty: (value) => ({
        isValid: value && value.toString().trim().length > 0,
        error: 'Field cannot be empty'
    }),
    
    alphanumeric: (value) => ({
        isValid: /^[a-zA-Z0-9]+$/.test(value),
        error: 'Field must contain only letters and numbers'
    }),
    
    uuid: (value) => ({
        isValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
        error: 'Invalid UUID format'
    })
};

module.exports = {
    validateRequiredFields,
    validateFieldTypes,
    validateStringLengths,
    validateSchema,
    sanitizeData,
    createRAGInputSchema,
    VALIDATION_PATTERNS
};
