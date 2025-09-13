// Database configuration and models
// This file serves as the main entry point for database operations

const config = require('../index');
const QdrantConfig = require('./qdrant');
const { connectMongoDB } = require('./mongodb');

// Import database connections based on configuration
let dbConnection = null;
let User = null;
let qdrantInstance = null;

// Initialize database based on configuration
const initializeDatabase = async () => {
  try {
    console.log('📊 Initializing databases...');
    
    // Initialize MongoDB first (required for most operations)
    try {
      await connectMongoDB();
      console.log('✅ MongoDB database initialized successfully');
    } catch (error) {
      console.error('❌ MongoDB initialization failed:', error.message);
      // MongoDB is critical, so we should throw the error
      throw error;
    }
    
    // Initialize Qdrant vector database
    if (process.env.ENABLE_QDRANT !== 'false') {
      try {
        qdrantInstance = new QdrantConfig();
        await qdrantInstance.connect();
        console.log('✅ Qdrant vector database initialized successfully');
      } catch (error) {
        console.error('❌ Qdrant initialization failed:', error.message);
        // Continue with other databases even if Qdrant fails
      }
    }
    
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Database utility functions
const getConnection = () => dbConnection;
const getUserModel = () => User;
const getQdrantInstance = () => qdrantInstance;

// Health check for database
const healthCheck = async () => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      databases: {}
    };

    // Check Qdrant health
    if (qdrantInstance) {
      try {
        const qdrantClient = qdrantInstance.getClient();
        await qdrantClient.getCollections();
        results.databases.qdrant = { status: 'healthy' };
      } catch (error) {
        results.databases.qdrant = { status: 'unhealthy', error: error.message };
      }
    } else {
      results.databases.qdrant = { status: 'not_initialized' };
    }

    // Add health checks for other databases here

    const allHealthy = Object.values(results.databases)
      .every(db => db.status === 'healthy' || db.status === 'not_initialized');

    results.overall = allHealthy ? 'healthy' : 'unhealthy';
    return results;
  } catch (error) {
    return { 
      overall: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

module.exports = {
  initializeDatabase,
  getConnection,
  getUserModel,
  getQdrantInstance,
  healthCheck
};
