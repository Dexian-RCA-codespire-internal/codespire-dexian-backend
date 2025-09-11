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
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      fromName: process.env.SMTP_FROM_NAME || 'Test BG App',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@test-bg.com'
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
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // Security configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
  }
};

module.exports = config;
