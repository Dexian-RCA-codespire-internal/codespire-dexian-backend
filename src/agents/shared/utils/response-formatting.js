/**
 * Response Formatting Utilities
 * Functional utilities for formatting and structuring API responses
 */

/**
 * Create standardized success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted success response
 */
function createSuccessResponse(data, message = 'Operation completed successfully', metadata = {}) {
    return {
        success: true,
        message,
        ...data,
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata
        }
    };
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {Object} details - Error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
function createErrorResponse(message, details = {}, statusCode = 500) {
    return {
        success: false,
        message,
        error: details,
        statusCode,
        timestamp: new Date().toISOString()
    };
}

/**
 * Format search results with pagination and metadata
 * @param {Array} results - Search results
 * @param {Object} query - Original query parameters
 * @param {Object} options - Formatting options
 * @param {number} options.processingTime - Processing time in milliseconds
 * @param {number} options.totalFound - Total results found before pagination
 * @param {Object} options.filters - Applied filters
 * @returns {Object} Formatted search response
 */
function formatSearchResults(results, query, options = {}) {
    const {
        processingTime,
        totalFound = results.length,
        filters = {}
    } = options;
    
    return {
        total_results: results.length,
        total_found: totalFound,
        query: query,
        filters_applied: Object.keys(filters).length > 0 ? filters : null,
        results: results,
        metadata: {
            processing_time_ms: processingTime,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Add ranking information to results
 * @param {Array} results - Results array
 * @param {string} scoreField - Field name containing the score (default: 'confidence_score')
 * @returns {Array} Results with ranking information
 */
function addRankingInfo(results, scoreField = 'confidence_score') {
    return results.map((item, index) => ({
        ...item,
        rank: index + 1,
        [`${scoreField}_percentage`]: item[scoreField] 
            ? Math.round(item[scoreField] * 100) 
            : null
    }));
}

/**
 * Filter response fields based on configuration
 * @param {Array|Object} data - Data to filter
 * @param {Array<string>} allowedFields - Fields to include in response
 * @param {Array<string>} excludeFields - Fields to exclude from response
 * @returns {Array|Object} Filtered data
 */
function filterResponseFields(data, allowedFields = [], excludeFields = []) {
    const filterObject = (obj) => {
        const filtered = {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Include field if it's in allowedFields (or allowedFields is empty) and not in excludeFields
            const shouldInclude = (allowedFields.length === 0 || allowedFields.includes(key)) && 
                                 !excludeFields.includes(key);
            
            if (shouldInclude) {
                filtered[key] = value;
            }
        }
        
        return filtered;
    };
    
    if (Array.isArray(data)) {
        return data.map(filterObject);
    } else {
        return filterObject(data);
    }
}

/**
 * Format confidence scores and thresholds
 * @param {Array} results - Results with confidence scores
 * @param {number} minThreshold - Minimum confidence threshold
 * @param {string} scoreField - Score field name
 * @returns {Object} Formatted confidence information
 */
function formatConfidenceInfo(results, minThreshold, scoreField = 'confidence_score') {
    const scores = results.map(r => r[scoreField]).filter(s => s !== undefined);
    
    return {
        min_threshold: minThreshold,
        min_threshold_percentage: Math.round(minThreshold * 100),
        results_above_threshold: results.length,
        average_confidence: scores.length > 0 
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : null,
        max_confidence: scores.length > 0 ? Math.max(...scores) : null,
        min_confidence: scores.length > 0 ? Math.min(...scores) : null
    };
}

/**
 * Create health check response format
 * @param {string} status - Health status ('healthy' | 'unhealthy' | 'degraded')
 * @param {Object} components - Component health status
 * @param {Object} details - Additional details
 * @returns {Object} Formatted health response
 */
function createHealthResponse(status, components = {}, details = {}) {
    return {
        status,
        timestamp: new Date().toISOString(),
        components,
        ...details
    };
}

/**
 * Format pagination information
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination information
 */
function createPaginationInfo(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    return {
        current_page: page,
        per_page: limit,
        total_items: total,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null
    };
}

/**
 * Format validation errors for API response
 * @param {Array} errors - Validation error array
 * @returns {Object} Formatted validation error response
 */
function formatValidationErrors(errors) {
    const groupedErrors = {};
    
    errors.forEach(error => {
        if (error.param) {
            if (!groupedErrors[error.param]) {
                groupedErrors[error.param] = [];
            }
            groupedErrors[error.param].push(error.msg || error.message || error);
        } else {
            if (!groupedErrors.general) {
                groupedErrors.general = [];
            }
            groupedErrors.general.push(error.msg || error.message || error);
        }
    });
    
    return {
        success: false,
        message: 'Validation failed',
        errors: groupedErrors,
        error_count: errors.length,
        timestamp: new Date().toISOString()
    };
}

/**
 * Create a standardized RAG response format
 * @param {Object} query - Original query
 * @param {Array} results - Search results
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted RAG response
 */
function createRAGResponse(query, results, options = {}) {
    const {
        processingTime,
        explanation,
        filters,
        minConfidenceThreshold = 0.7,
        includeDebugInfo = false
    } = options;
    
    // Add ranking information
    const rankedResults = addRankingInfo(results);
    
    // Create confidence information
    const confidenceInfo = formatConfidenceInfo(rankedResults, minConfidenceThreshold);
    
    const response = createSuccessResponse({
        query: query,
        total_results: rankedResults.length,
        confidence_info: confidenceInfo,
        results: rankedResults
    }, `Found ${rankedResults.length} similar items above ${Math.round(minConfidenceThreshold * 100)}% confidence`, {
        processing_time_ms: processingTime
    });
    
    // Add optional fields
    if (explanation) {
        response.explanation = explanation;
    }
    
    if (filters && Object.keys(filters).length > 0) {
        response.filters_applied = filters;
    }
    
    if (includeDebugInfo) {
        response.debug = {
            confidence_threshold: minConfidenceThreshold,
            raw_result_count: results.length
        };
    }
    
    return response;
}

module.exports = {
    createSuccessResponse,
    createErrorResponse,
    formatSearchResults,
    addRankingInfo,
    filterResponseFields,
    formatConfidenceInfo,
    createHealthResponse,
    createPaginationInfo,
    formatValidationErrors,
    createRAGResponse
};
