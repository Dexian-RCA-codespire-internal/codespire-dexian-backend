const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const connectMongoDB = async () => {
  try {
    // Use MongoDB connection string from environment or default (no auth)
    let mongoUrl = process.env.TICKET_DATABASE_URL;
    
    if (!mongoUrl) {
      throw new Error('TICKET_DATABASE_URL environment variable is not set');
    }

    // If MongoDB credentials are provided separately, construct the URL
    const mongoUser = process.env.MONGO_USERNAME;
    const mongoPassword = process.env.MONGO_PASSWORD;
    
    if (mongoUser && mongoPassword && !mongoUrl.includes('@')) {
      // Extract host, port, and database from the URL
      const urlParts = mongoUrl.replace('mongodb://', '').split('/');
      const hostPort = urlParts[0];
      const database = urlParts[1] || '';
      
      // Construct authenticated URL
      mongoUrl = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${hostPort}/${database}`;
      logger.info('🔐 Using MongoDB with authentication');
    }

    logger.info('Connecting to MongoDB...');
    logger.info(`MongoDB URL: ${mongoUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs

    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 30000, // Increased from 5000ms to 30000ms
      socketTimeoutMS: 60000, // Increased from 45000ms to 60000ms
      connectTimeoutMS: 30000, // Added connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain a minimum of 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      waitQueueTimeoutMS: 5000, // Make the client wait up to 5 seconds for a connection to become available
    });
    
    logger.info('✅ MongoDB connection established successfully.');
    logger.info(`Connection state: ${mongoose.connection.readyState}`);
    logger.info(`Database name: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error('❌ Unable to connect to MongoDB:', error.message);
    console.error('📍 MongoDB URL provided:', process.env.TICKET_DATABASE_URL ? 'Yes' : 'No');
    
    // More specific error messages
    if (error.message.includes('ENOTFOUND')) {
      console.error('💡 Hint: Check if MongoDB server is running and the hostname is correct');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Hint: Check if MongoDB is running on the specified port');
    } else if (error.message.includes('Authentication failed') || error.message.includes('Command find requires authentication')) {
      console.error('💡 Hint: MongoDB requires authentication. Please set:');
      console.error('   - MONGO_USERNAME environment variable');
      console.error('   - MONGO_PASSWORD environment variable');
      console.error('   - Or update TICKET_DATABASE_URL to include credentials: mongodb://username:password@host:port/database');
    }
    
    throw error; // Re-throw to stop the application startup
  }
};

const disconnectMongoDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('✅ MongoDB disconnected successfully.');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await disconnectMongoDB();
  process.exit(0);
});

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  connection: mongoose.connection
};
