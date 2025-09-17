const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const { getRegisteredEndpoints } = require('./utils/swaggerAutoRegister');
const logger = require('./utils/logger');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Codespire Dexian Backend API',
    version: '1.0.0',
    description: 'API documentation for the Codespire Dexian Backend microservice',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:8000/api/v1',
      description: 'Development server',
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development server (fallback)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          message: {
            type: 'string',
            description: 'Detailed error description',
          },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'OK',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          uptime: {
            type: 'number',
            description: 'Server uptime in seconds',
          },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Unique ticket identifier',
          },
          ticketId: {
            type: 'string',
            description: 'ServiceNow ticket ID',
          },
          subject: {
            type: 'string',
            description: 'Ticket subject/title',
          },
          description: {
            type: 'string',
            description: 'Ticket description',
          },
          status: {
            type: 'string',
            description: 'Ticket status',
            enum: ['open', 'in_progress', 'resolved', 'closed'],
          },
          priority: {
            type: 'string',
            description: 'Ticket priority',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Options for the swagger docs
const options = {
  definition: swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    path.join(__dirname, './routes/*.js'), // Include all route files
    path.join(__dirname, './controllers/*.js'), // Include controller files if they have JSDoc
    path.join(__dirname, './app.js'), // Include main app file
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

/**
 * Generate dynamic Swagger specification
 * @param {number} port - Port number the server is running on
 * @returns {object} Complete Swagger specification
 */
function generateSwaggerSpec(port = 8000) {
  // Get auto-registered endpoints
  const autoRegisteredPaths = getRegisteredEndpoints();
  
  // Update server URLs dynamically
  const dynamicSwaggerDefinition = {
    ...swaggerDefinition,
    servers: [
      {
        url: `http://localhost:${port}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local development server (fallback)',
      },
    ],
  };

  // Generate base spec from JSDoc comments
  const baseSpec = swaggerJSDoc({
    definition: dynamicSwaggerDefinition,
    apis: [
      path.join(__dirname, './routes/*.js'),
      path.join(__dirname, './controllers/*.js'),
      path.join(__dirname, './app.js'),
    ],
  });

  // Merge auto-registered endpoints with JSDoc endpoints
  const mergedPaths = {
    ...baseSpec.paths,
    ...autoRegisteredPaths
  };

  // Return complete specification
  return {
    ...baseSpec,
    paths: mergedPaths
  };
}

/**
 * Setup Swagger middleware for Express app
 * @param {object} app - Express application instance
 * @param {number} port - Port number the server is running on
 */
const setupSwagger = (app, port = 8000) => {
  // Generate dynamic spec
  let currentSpec = generateSwaggerSpec(port);

  // Swagger page with dynamic spec regeneration
  app.use('/api/docs', swaggerUi.serve, (req, res, next) => {
    // Regenerate spec on each request to include newly registered endpoints
    currentSpec = generateSwaggerSpec(port);
    swaggerUi.setup(currentSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Codespire Dexian API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    })(req, res, next);
  });

  // Docs in JSON format with dynamic regeneration
  app.get('/api/docs.json', (req, res) => {
    currentSpec = generateSwaggerSpec(port);
    res.setHeader('Content-Type', 'application/json');
    res.send(currentSpec);
  });

  logger.info('📚 Swagger documentation available at:');
  logger.info(`   - Interactive docs: http://localhost:${port}/api/docs`);
  logger.info(`   - JSON spec: http://localhost:${port}/api/docs.json`);
  logger.info('📝 Auto-registration enabled - endpoints will be documented automatically!');
};

module.exports = {
  setupSwagger,
  swaggerSpec,
};
