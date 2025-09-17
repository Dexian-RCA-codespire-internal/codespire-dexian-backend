const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
fs.mkdirSync(logsDir, { recursive: true });

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Only show essential meta data
    const essentialMeta = {};
    if (meta.ip) essentialMeta.ip = meta.ip;
    if (meta.statusCode) essentialMeta.status = meta.statusCode;
    if (meta.duration) essentialMeta.duration = meta.duration;
    
    // Ensure JSON is compact (single line)
    const metaString = Object.keys(essentialMeta).length ? JSON.stringify(essentialMeta, null, 0) : '';
    
    return `${timestamp} [${level}]: ${message} ${metaString}`.trim();
  })
);

// Create Sentry transport
const createSentryTransport = () => {
  if (!global.sentry) {
    return null;
  }

  return new winston.transports.Stream({
    stream: {
      write: (message) => {
        try {
          const logData = JSON.parse(message);
          
          // Send to Sentry based on log level
          if (logData.level === 'error') {
            global.sentry.captureException(new Error(logData.message), {
              tags: {
                service: 'codespire-dexian-backend',
                logger: 'winston',
                level: logData.level
              },
              extra: {
                ...logData,
                timestamp: logData.timestamp
              }
            });
          } else if (logData.level === 'warn') {
            global.sentry.captureMessage(logData.message, 'warning');
          } else {
            // Add breadcrumb for info/debug logs
            global.sentry.addBreadcrumb({
              category: 'application',
              message: logData.message,
              level: logData.level,
              data: logData
            });
          }
        } catch (error) {
          // Fallback if JSON parsing fails
          global.sentry.captureMessage(message, 'info');
        }
      }
    }
  });
};

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'codespire-dexian-backend' },
  transports: [
    // Write all logs to rotating files
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add Sentry transport if available
const sentryTransport = createSentryTransport();
if (sentryTransport) {
  logger.add(sentryTransport);
}

module.exports = logger;
