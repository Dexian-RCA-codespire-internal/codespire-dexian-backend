const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configurations
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
  },
  
  // SuperTokens configuration
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || 'http://localhost:3567',
    apiKey: process.env.SUPERTOKENS_API_KEY,
    appName: process.env.SUPERTOKENS_APP_NAME || 'your-app-name',
    appDomain: process.env.SUPERTOKENS_APP_DOMAIN || 'http://localhost:3000',
    apiDomain: process.env.SUPERTOKENS_API_DOMAIN || 'http://localhost:3000'
  },

  // Novu configuration
  novu: {
    apiKey: process.env.NOVU_API_KEY,
    appIdentifier: process.env.NOVU_APP_IDENTIFIER || 'test-bg-app',
    backendUrl: process.env.NOVU_BACKEND_URL || 'https://api.novu.co'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // Storage configuration
  storage: {
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'test-bg-s3-bucket'
    }
  },

  // ServiceNow configuration
  servicenow: {
    url: process.env.SERVICENOW_URL,
    username: process.env.SERVICENOW_USERNAME,
    password: process.env.SERVICENOW_PASSWORD,
    apiEndpoint: process.env.SERVICENOW_API_ENDPOINT || '/api/now/table/incident',
    timeout: parseInt(process.env.SERVICENOW_TIMEOUT) || 30000
  },

  // Output configuration
  output: {
    filename: process.env.OUTPUT_FILENAME || 'tickets.json',
    maxRecords: parseInt(process.env.MAX_RECORDS) || 10
  },

  // Query configuration for ServiceNow
  query: {
    sysparm_limit: parseInt(process.env.SERVICENOW_QUERY_LIMIT) || 100,
    sysparm_query: process.env.SERVICENOW_QUERY || '',
    sysparm_fields: process.env.SERVICENOW_FIELDS || 'sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags',
    sysparm_display_value: 'true'
  }
};

module.exports = config;
