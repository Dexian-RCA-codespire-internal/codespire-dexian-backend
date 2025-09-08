// Storage service factory
// This file serves as the main entry point for storage operations

const config = require('../config');

let storageService = null;

// Initialize storage service based on configuration
const initializeStorage = () => {
  try {
    const storageType = config.storage.type;
    
    switch (storageType) {
      case 'aws-s3':
        const S3Service = require('../services/s3Service');
        storageService = new S3Service();
        break;
      case 'gcs':
        const GCSService = require('../services/gcsService');
        storageService = new GCSService();
        break;
      case 'local':
        const LocalStorageService = require('../services/localStorageService');
        storageService = new LocalStorageService();
        break;
      default:
        console.log('⚠️  No storage service configured');
        storageService = null;
    }
    
    console.log(`📦 Storage service initialized: ${storageType || 'none'}`);
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    storageService = null;
  }
};

// Get storage service instance
const getStorageService = () => storageService;

// Health check for storage
const healthCheck = async () => {
  try {
    if (!storageService) {
      return { status: 'not_configured', timestamp: new Date().toISOString() };
    }
    
    // Implement your storage health check logic here
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};

module.exports = {
  initializeStorage,
  getStorageService,
  healthCheck
};
