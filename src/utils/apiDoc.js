/**
 * Simple API Documentation Utility
 * Import this in your route files and use the simple functions to auto-document your endpoints
 * 
 * Usage Example:
 * const { doc } = require('../utils/apiDoc');
 * 
 * // Simple usage - just add this line before your route definition
 * router.get('/', doc.getList('/tickets', 'Get all tickets', ['Tickets']), getTickets);
 */

const { autoDoc, quickSetup, registerEndpoint, commonParams, commonResponses } = require('./swaggerAutoRegister');

/**
 * Simple documentation functions that developers can use with one line
 */
const doc = {
  /**
   * Document a GET endpoint that returns a list of items
   * @param {string} path - Endpoint path (e.g., '/tickets')
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   * @param {Object[]} extraParams - Additional parameters (optional)
   */
  getList: (path, summary, tags = ['API'], extraParams = []) => {
    return autoDoc({
      ...quickSetup.getList(path, summary, tags),
      parameters: [...quickSetup.getList(path, summary, tags).parameters, ...extraParams]
    });
  },

  /**
   * Document a GET endpoint that returns a single item by ID
   * @param {string} path - Endpoint path (e.g., '/tickets/:id')
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   */
  getById: (path, summary, tags = ['API']) => {
    return autoDoc(quickSetup.getItem(path, summary, tags));
  },

  /**
   * Document a POST endpoint for creating resources
   * @param {string} path - Endpoint path (e.g., '/tickets')
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   * @param {Object} bodySchema - Request body schema (optional)
   */
  create: (path, summary, tags = ['API'], bodySchema = null) => {
    return autoDoc(quickSetup.create(path, summary, tags, bodySchema));
  },

  /**
   * Document a PUT endpoint for updating resources
   * @param {string} path - Endpoint path (e.g., '/tickets/:id')
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   * @param {Object} bodySchema - Request body schema (optional)
   */
  update: (path, summary, tags = ['API'], bodySchema = null) => {
    return autoDoc(quickSetup.update(path, summary, tags, bodySchema));
  },

  /**
   * Document a DELETE endpoint
   * @param {string} path - Endpoint path (e.g., '/tickets/:id')
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   */
  delete: (path, summary, tags = ['API']) => {
    return autoDoc(quickSetup.delete(path, summary, tags));
  },

  /**
   * Document a custom endpoint with full configuration
   * @param {Object} config - Full endpoint configuration
   */
  custom: (config) => {
    return autoDoc(config);
  },

  /**
   * Quick documentation for simple GET endpoints
   * @param {string} path - Endpoint path
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   */
  get: (path, summary, tags = ['API']) => {
    return autoDoc({
      method: 'get',
      path,
      summary,
      tags,
      responses: commonResponses.successItem
    });
  },

  /**
   * Quick documentation for simple POST endpoints
   * @param {string} path - Endpoint path
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   */
  post: (path, summary, tags = ['API']) => {
    return autoDoc({
      method: 'post',
      path,
      summary,
      tags,
      responses: commonResponses.created,
      requiresAuth: true
    });
  },

  /**
   * Quick documentation for simple PATCH endpoints
   * @param {string} path - Endpoint path
   * @param {string} summary - Brief description
   * @param {string[]} tags - Tags for grouping (optional)
   */
  patch: (path, summary, tags = ['API']) => {
    return autoDoc({
      method: 'patch',
      path,
      summary,
      tags,
      responses: commonResponses.successItem,
      requiresAuth: true
    });
  }
};

/**
 * Common schemas that developers can reuse (simplified)
 */
const schemas = {
  // Basic ticket schema
  ticket: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Ticket subject' },
      description: { type: 'string', description: 'Ticket description' }
    },
    required: ['subject', 'description']
  },

  // Basic user schema
  user: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 }
    },
    required: ['email', 'password']
  }
};

/**
 * Pre-configured parameter sets for common use cases (simplified)
 */
const params = {
  // Standard pagination parameters (kept minimal)
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
  ]
};

module.exports = {
  doc,
  schemas,
  params,
  // Export lower-level functions for advanced usage
  autoDoc,
  registerEndpoint,
  quickSetup,
  commonParams,
  commonResponses
};
