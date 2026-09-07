const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  const retryDelay = 5000; // 5 seconds

  const connectWithRetry = async () => {
    try {
      // Check if MONGO_URI is set
      if (!process.env.MONGO_URI) {
        logger.error('MONGO_URI is not defined in environment variables');
        console.error('ERROR: MONGO_URI is not defined in environment variables');
        console.error('Please create a .env file in the server directory with: MONGO_URI=your_connection_string');
        process.exit(1);
      }

      // Connect to MongoDB Atlas
      // For MongoDB Atlas, the connection string format should be:
      // mongodb+srv://username:password@cluster.mongodb.net/database_name?appName=AppName
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      logger.info(`MongoDB Connected: ${conn.connection.host}`, { database: conn.connection.name });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);

      try {
        const { ensureLaunchVisualizers } = require('../services/visualizerCatalogService');
        await ensureLaunchVisualizers();
      } catch (catalogErr) {
        logger.error('[visualizers] Failed to ensure launch catalog', { error: catalogErr.message });
      }
      
      // Reset retry counter on successful connection
      retries = 0;
    } catch (err) {
      retries++;
      logger.error('MongoDB Connection Error:', { 
        error: err.message, 
        retry: `${retries}/${maxRetries}` 
      });
      console.error(`❌ MongoDB Connection Error (Attempt ${retries}/${maxRetries}):`, err.message);
      
      // Provide helpful error messages
      if (err.message.includes('authentication failed')) {
        console.error('💡 Tip: Check your database username and password in the connection string');
      } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
        console.error('💡 Tip: Check your network connection and MongoDB Atlas cluster status');
      } else if (err.message.includes('Invalid connection string')) {
        console.error('💡 Tip: Verify your MONGO_URI format: mongodb+srv://username:password@cluster.mongodb.net/database');
      }
      
      if (retries < maxRetries) {
        const delay = retryDelay * Math.pow(2, retries - 1); // Exponential backoff
        logger.info(`Retrying MongoDB connection in ${delay}ms...`);
        console.log(`⏳ Retrying connection in ${delay / 1000} seconds...`);
        setTimeout(connectWithRetry, delay);
      } else {
        logger.error('Max retries reached. Exiting...');
        console.error('❌ Max retry attempts reached. Exiting...');
        process.exit(1);
      }
    }
  };

  // Handle connection events
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
    if (retries < maxRetries) {
      connectWithRetry();
    }
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', { error: err.message });
  });

  // Start initial connection
  await connectWithRetry();
};

module.exports = connectDB;