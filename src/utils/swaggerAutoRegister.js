/**
 * Automatic Swagger Endpoint Registration Utility
 * This utility allows developers to automatically register API endpoints with minimal configuration
 */

const swaggerEndpoints = new Map();

/**
 * Auto-register an endpoint for Swagger documentation
 * @param {Object} config - Endpoint configuration
 * @param {string} config.method - HTTP method (get, post, put, delete, patch)
 * @param {string} config.path - API endpoint path (without /api/v1 prefix)
 * @param {string} config.summary - Brief description of the endpoint
 * @param {string} config.description - Detailed description (optional)
 * @param {string|Array} config.tags - Tags for grouping endpoints
 * @param {Object} config.parameters - Parameters configuration (optional)
 * @param {Object} config.requestBody - Request body schema (optional)
 * @param {Object} config.responses - Response schemas (optional)
 * @param {boolean} config.requiresAuth - Whether endpoint requires authentication (optional)
 */
function registerEndpoint(config) {
  const {
    method,
    path,
    summary,
    description = summary,
    tags = ['API'],
    parameters = [],
    requestBody = null,
    responses = {},
    requiresAuth = false
  } = config;

  // Default responses if not provided
  const defaultResponses = {
    200: {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    ...responses
  };

  // Build the endpoint specification
  const endpointSpec = {
    summary,
    description,
    tags: Array.isArray(tags) ? tags : [tags],
    parameters,
    responses: defaultResponses
  };

  // Add request body if provided
  if (requestBody) {
    endpointSpec.requestBody = requestBody;
  }

  // Add security if authentication is required
  if (requiresAuth) {
    endpointSpec.security = [{ bearerAuth: [] }];
  }

  // Store the endpoint specification
  const key = `${method.toLowerCase()}:${path}`;
  swaggerEndpoints.set(key, endpointSpec);

  console.log(`📝 Auto-registered endpoint: ${method.toUpperCase()} ${path}`);
}

/**
 * Express middleware to automatically register and document an endpoint
 * @param {Object} config - Endpoint configuration (same as registerEndpoint)
 * @returns {Function} Express middleware function
 */
function autoDoc(config) {
  // Register the endpoint for Swagger
  registerEndpoint(config);

  // Return a middleware that does nothing (just for registration)
  return (req, res, next) => {
    next();
  };
}

/**
 * Helper function to create common parameter objects (simplified)
 */
const commonParams = {
  // Basic pagination parameters
  pagination: [
    {
      in: 'query',
      name: 'page',
      schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number'
    },
    {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      description: 'Items per page'
    }
  ],

  // Path parameter for ID
  idParam: {
    in: 'path',
    name: 'id',
    required: true,
    schema: { type: 'string' },
    description: 'Resource identifier'
  }
};

/**
 * Helper function to create common response objects
 */
const commonResponses = {
  // Standard success with data array
  successList: {
    200: {
      description: 'List retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { type: 'object' }
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  totalPages: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  },

  // Standard success with single item
  successItem: {
    200: {
      description: 'Item retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' }
            }
          }
        }
      }
    }
  },

  // Not found response
  notFound: {
    404: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Resource not found' }
            }
          }
        }
      }
    }
  },

  // Created response
  created: {
    201: {
      description: 'Resource created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              message: { type: 'string', example: 'Resource created successfully' }
            }
          }
        }
      }
    }
  }
};

/**
 * Quick setup functions for common endpoint types
 */
const quickSetup = {
  // GET list endpoint with pagination
  getList: (path, summary, tags = ['API']) => ({
    method: 'get',
    path,
    summary,
    tags,
    parameters: commonParams.pagination,
    responses: commonResponses.successList
  }),

  // GET single item endpoint
  getItem: (path, summary, tags = ['API']) => ({
    method: 'get',
    path,
    summary,
    tags,
    parameters: [commonParams.idParam],
    responses: { ...commonResponses.successItem, ...commonResponses.notFound }
  }),

  // POST create endpoint
  create: (path, summary, tags = ['API'], requestBodySchema = null) => ({
    method: 'post',
    path,
    summary,
    tags,
    requestBody: requestBodySchema ? {
      required: true,
      content: {
        'application/json': {
          schema: requestBodySchema
        }
      }
    } : null,
    responses: { ...commonResponses.created },
    requiresAuth: true
  }),

  // PUT update endpoint
  update: (path, summary, tags = ['API'], requestBodySchema = null) => ({
    method: 'put',
    path,
    summary,
    tags,
    parameters: [commonParams.idParam],
    requestBody: requestBodySchema ? {
      required: true,
      content: {
        'application/json': {
          schema: requestBodySchema
        }
      }
    } : null,
    responses: { ...commonResponses.successItem, ...commonResponses.notFound },
    requiresAuth: true
  }),

  // DELETE endpoint
  delete: (path, summary, tags = ['API']) => ({
    method: 'delete',
    path,
    summary,
    tags,
    parameters: [commonParams.idParam],
    responses: {
      200: {
        description: 'Resource deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Resource deleted successfully' }
              }
            }
          }
        }
      },
      ...commonResponses.notFound
    },
    requiresAuth: true
  })
};

/**
 * Get all registered endpoints for Swagger spec generation
 */
function getRegisteredEndpoints() {
  const paths = {};
  
  swaggerEndpoints.forEach((spec, key) => {
    const [method, path] = key.split(':');
    
    if (!paths[path]) {
      paths[path] = {};
    }
    
    paths[path][method] = spec;
  });
  
  return paths;
}

/**
 * Clear all registered endpoints (useful for testing)
 */
function clearEndpoints() {
  swaggerEndpoints.clear();
}

module.exports = {
  registerEndpoint,
  autoDoc,
  commonParams,
  commonResponses,
  quickSetup,
  getRegisteredEndpoints,
  clearEndpoints
};