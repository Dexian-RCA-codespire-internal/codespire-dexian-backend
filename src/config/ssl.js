// new file servicenow
const fs = require('fs');
const path = require('path');

/**
 * SSL/TLS Configuration for HTTPS and WSS
 */
class SSLConfig {
  constructor() {
    this.sslEnabled = process.env.SSL_ENABLED === 'true';
    this.sslKeyPath = process.env.SSL_KEY_PATH || './certs/private-key.pem';
    this.sslCertPath = process.env.SSL_CERT_PATH || './certs/certificate.pem';
    this.sslCaPath = process.env.SSL_CA_PATH || './certs/ca.pem';
  }

  /**
   * Check if SSL certificates exist
   * @returns {Boolean} - Whether SSL certificates are available
   */
  hasSSLCertificates() {
    if (!this.sslEnabled) {
      return false;
    }

    try {
      return fs.existsSync(this.sslKeyPath) && fs.existsSync(this.sslCertPath);
    } catch (error) {
      console.error('Error checking SSL certificates:', error);
      return false;
    }
  }

  /**
   * Get SSL options for HTTPS server
   * @returns {Object} - SSL options or null if not available
   */
  getSSLOptions() {
    if (!this.hasSSLCertificates()) {
      return null;
    }

    try {
      const options = {
        key: fs.readFileSync(this.sslKeyPath),
        cert: fs.readFileSync(this.sslCertPath)
      };

      // Add CA certificate if available
      if (fs.existsSync(this.sslCaPath)) {
        options.ca = fs.readFileSync(this.sslCaPath);
      }

      return options;
    } catch (error) {
      console.error('Error reading SSL certificates:', error);
      return null;
    }
  }

  /**
   * Create HTTPS server with SSL options
   * @param {Object} app - Express app
   * @returns {Object} - HTTPS server instance
   */
  createHTTPSServer(app) {
    if (!this.hasSSLCertificates()) {
      console.warn('⚠️ SSL certificates not found, falling back to HTTP');
      return null;
    }

    try {
      const https = require('https');
      const sslOptions = this.getSSLOptions();
      
      if (!sslOptions) {
        return null;
      }

      const server = https.createServer(sslOptions, app);
      console.log('✅ HTTPS server created with SSL certificates');
      return server;
    } catch (error) {
      console.error('Error creating HTTPS server:', error);
      return null;
    }
  }

  /**
   * Get WebSocket server URL based on SSL configuration
   * @param {Number} port - Server port
   * @returns {String} - WebSocket server URL
   */
  getWebSocketURL(port) {
    if (this.hasSSLCertificates()) {
      return `wss://localhost:${port}`;
    } else {
      return `ws://localhost:${port}`;
    }
  }

  /**
   * Get HTTP server URL based on SSL configuration
   * @param {Number} port - Server port
   * @returns {String} - HTTP server URL
   */
  getHTTPURL(port) {
    if (this.hasSSLCertificates()) {
      return `https://localhost:${port}`;
    } else {
      return `http://localhost:${port}`;
    }
  }

  /**
   * Log SSL configuration status
   */
  logSSLStatus() {
    console.log('🔒 SSL Configuration:');
    console.log(`   - SSL Enabled: ${this.sslEnabled}`);
    console.log(`   - Certificates Available: ${this.hasSSLCertificates()}`);
    
    if (this.hasSSLCertificates()) {
      console.log(`   - Key Path: ${this.sslKeyPath}`);
      console.log(`   - Cert Path: ${this.sslCertPath}`);
      if (fs.existsSync(this.sslCaPath)) {
        console.log(`   - CA Path: ${this.sslCaPath}`);
      }
    } else {
      console.log('   - Using HTTP/WS (unencrypted)');
    }
  }
}

// Create singleton instance
const sslConfig = new SSLConfig();

module.exports = {
  SSLConfig,
  sslConfig
};

