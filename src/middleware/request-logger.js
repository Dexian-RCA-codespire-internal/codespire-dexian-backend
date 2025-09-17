const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  // Skip logging for health checks, static files, and favicon
  if (req.path === '/health' || req.path.startsWith('/static/') || req.path === '/favicon.ico') {
    return next();
  }

  // Log request details
  const startTime = Date.now();
  
  // Log incoming request (minimal info)
  logger.info(`📥 ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 50) // Truncate long user agents
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Log response details (minimal info)
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`📤 ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    // Record performance metrics
    if (global.performanceMonitor) {
      global.performanceMonitor.recordRequest(duration, success);
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;
