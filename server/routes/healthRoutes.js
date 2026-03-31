const express = require('express');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint for monitoring and load balancers
 * @access  Public
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: 'unknown',
    },
  };

  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    healthCheck.database = {
      status: dbStates[dbState] || 'unknown',
      readyState: dbState,
    };

    if (dbState === 1) {
      // Database is connected, try a simple query
      await mongoose.connection.db.admin().ping();
      healthCheck.database.status = 'healthy';
    } else {
      healthCheck.database.status = 'unhealthy';
    }

    // Determine overall health status
    const isHealthy = healthCheck.database.status === 'healthy';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    healthCheck.database.status = 'unhealthy';
    healthCheck.message = 'Service Unavailable';
    healthCheck.error = process.env.NODE_ENV === 'development' ? error.message : undefined;
    
    res.status(503).json(healthCheck);
  }
});

module.exports = router;


