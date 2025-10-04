require('dotenv').config();

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
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_MAX_TOKENS: process.env.GEMINI_MAX_TOKENS,
  GEMINI_TEMPERATURE: process.env.GEMINI_TEMPERATURE,
  
  // SuperTokens configuration
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || 'http://localhost:3567',
    apiKey: process.env.SUPERTOKENS_API_KEY,
    appName: process.env.SUPERTOKENS_APP_NAME || 'your-app-name',
    appDomain: process.env.SUPERTOKENS_APP_DOMAIN || 'http://localhost:3001',
    apiDomain: process.env.SUPERTOKENS_API_DOMAIN || 'http://localhost:8081',
    
    // Token validity configuration - UNIFIED to use minutes only
    // Set these in your .env file:
    // ACCESS_TOKEN_MINUTES=60    (access token lifetime in minutes)
    // REFRESH_TOKEN_MINUTES=2880 (refresh token lifetime in minutes)
    accessTokenMinutes: parseInt(process.env.ACCESS_TOKEN_MINUTES) || 60,
    refreshTokenMinutes: parseInt(process.env.REFRESH_TOKEN_MINUTES) || 2880,
    
    // SuperTokens core expects milliseconds - convert from minutes
    get accessTokenValidity() {
      return this.accessTokenMinutes * 60 * 1000;
    },
    get refreshTokenValidity() {
      return this.refreshTokenMinutes * 60 * 1000;
    }
  },

  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : (process.env.CORS_ORIGIN || '*'),
    credentials: process.env.CORS_CREDENTIALS === 'true' || true
  },

  // Storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'aws-s3',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'test-bg-s3-bucket'
    },
    minio: {
      accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
      bucket: process.env.MINIO_BUCKET || 'test-bg-bucket'
    },
    azure: {
      containerName: process.env.AZURE_CONTAINER_NAME || 'test-bg-container'
    }
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || "smtp-mail.outlook.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      user: process.env.SMTP_USER || "pramod@codespiresolutions.com",
      password: process.env.SMTP_PASSWORD || "sswyyhytchrsfckf",
      fromName: process.env.SMTP_FROM_NAME || "Pramod",
      fromEmail: process.env.SMTP_FROM_EMAIL || "pramod@codespiresolutions.com"
    },
    assets: {
      companyName: process.env.EMAIL_COMPANY_NAME || "Dexian",
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL || "support@dexian.com",
      logo: {
        alt: process.env.EMAIL_LOGO_ALT || "Dexian Logo",
        width: process.env.EMAIL_LOGO_WIDTH || "120",
        height: process.env.EMAIL_LOGO_HEIGHT || "auto"
      }
    }
  },

  // OTP configuration
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    length: parseInt(process.env.OTP_LENGTH) || 6
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production'
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // Security configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
  },

    // ServiceNow configuration
    servicenow: {
      url: process.env.SERVICENOW_URL,
      username: process.env.SERVICENOW_USERNAME,
      password: process.env.SERVICENOW_PASSWORD,
      apiEndpoint: process.env.SERVICENOW_API_ENDPOINT || '/api/now/table/incident',
      timeout: parseInt(process.env.SERVICENOW_TIMEOUT) || 30000,
      // Polling configuration
      pollingInterval: process.env.SERVICENOW_POLLING_INTERVAL || '*/1 * * * *', // Every minute
      pollingBatchSize: parseInt(process.env.SERVICENOW_POLLING_BATCH_SIZE) || 10,
      maxRetries: parseInt(process.env.SERVICENOW_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.SERVICENOW_RETRY_DELAY) || 5000,
      enablePolling: process.env.SERVICENOW_ENABLE_POLLING === 'true' || false,
      // Bulk import configuration
      enableBulkImport: process.env.SERVICENOW_ENABLE_BULK_IMPORT === 'true' || false,
      bulkImportBatchSize: parseInt(process.env.SERVICENOW_BULK_IMPORT_BATCH_SIZE) || 100,
      // Health check configuration
      healthCheckIntervalSeconds: parseInt(process.env.SERVICENOW_HEALTH_CHECK_INTERVAL_SECONDS) || 10
    },

      // Output configuration
  output: {
    filename: process.env.OUTPUT_FILENAME || 'tickets.json',
    maxRecords: parseInt(process.env.MAX_RECORDS) || 50
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
