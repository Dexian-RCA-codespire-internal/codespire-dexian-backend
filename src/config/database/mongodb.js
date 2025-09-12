const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    // Use MongoDB connection string from environment or default (no auth)
    const mongoUrl = process.env.TICKET_DATABASE_URL ;

    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to MongoDB:', error);
    console.error('MongoDB URL:', process.env.TICKET_DATABASE_URL);
    // Don't exit process, just log the error
  }
};

const disconnectMongoDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully.');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
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
