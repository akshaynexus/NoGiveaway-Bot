'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const DatabaseUtil = require('./dbhelper');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Initialize Express app with security middleware
const app = express();

// Security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Content-Type', 'application/json');
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`🌐 API Request: ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Load blacklist data safely
let BLIDs = [];
try {
  const dataPath = path.join(__dirname, '..', 'outputx.json');
  if (fs.existsSync(dataPath)) {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    BLIDs = JSON.parse(rawData);
    if (process.env.NODE_ENV !== 'test') {
    console.log(`📊 Loaded ${BLIDs.length} blacklisted IDs from file`);
  }
  } else {
    console.log('⚠️ No outputx.json file found, starting with empty blacklist');
  }
} catch (error) {
  console.error('❌ Error loading blacklist data:', error.message);
  BLIDs = [];
}

// Enhanced server startup with error handling
function startServer() {
  try {
    const server = app.listen(PORT, HOST, () => {
      console.log(`🌐 API server running on http://${HOST}:${PORT}`);
      console.log('📊 Available endpoints:');
      console.log(`  - GET /health - Health check`);
      console.log(`  - GET /blacklistids - Get blacklisted IDs`);
      console.log(`  - GET /stats - Get database statistics`);
      console.log(`  - GET /lastjoins - Get recent joins`);
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error.message);
      }
      process.exit(1);
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = () => {
      console.log('🛑 Shutting down API server...');
      server.close(() => {
        console.log('✅ API server closed');
      });
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start API server:', error.message);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    database: DatabaseUtil.mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  res.json(health);
});

// Enhanced blacklist IDs endpoint
app.get('/blacklistids', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Validate parameters
    if (limit > 1000) {
      return res.status(400).json({
        error: 'Limit cannot exceed 1000',
        maxLimit: 1000
      });
    }
    
    const paginatedIds = BLIDs.slice(offset, offset + limit);
    
    res.json({
      data: paginatedIds,
      pagination: {
        total: BLIDs.length,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < BLIDs.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /blacklistids:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve blacklist data'
    });
  }
});

// Database statistics endpoint
app.get('/stats', async (req, res) => {
  try {
    const stats = await DatabaseUtil.getDatabaseStats();
    
    if (!stats) {
      return res.status(500).json({
        error: 'Failed to retrieve database statistics'
      });
    }
    
    res.json({
      database: stats,
      blacklistFile: {
        totalIds: BLIDs.length,
        lastLoaded: new Date().toISOString()
      },
      api: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in /stats:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve statistics'
    });
  }
});

// Recent joins endpoint
app.get('/lastjoins', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const ServerJoin = DatabaseUtil.mongoose.model('ServerJoin');
    
    const recentJoins = await ServerJoin
      .find()
      .sort({ joinTimestamp: -1 })
      .limit(limit)
      .select('username userid servername serverid joinTimestamp isBot')
      .lean();
    
    res.json({
      data: recentJoins,
      count: recentJoins.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /lastjoins:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve recent joins'
    });
  }
});

// User lookup endpoint
app.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId || !/^\d+$/.test(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format'
      });
    }
    
    const userStats = await DatabaseUtil.getUserJoinStats(userId);
    
    if (!userStats) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      userId: userId,
      ...userStats,
      isBlacklisted: BLIDs.includes(userId)
    });
    
  } catch (error) {
    console.error('❌ Error in /user/:userId:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve user information'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: ['/health', '/blacklistids', '/stats', '/lastjoins', '/user/:userId']
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ API Error:', error.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});
// Utility function to reload blacklist data
function reloadBlacklistData() {
  try {
    const dataPath = path.join(__dirname, '..', 'outputx.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      BLIDs = JSON.parse(rawData);
      console.log(`🔄 Reloaded ${BLIDs.length} blacklisted IDs`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error reloading blacklist data:', error.message);
    return false;
  }
}

// Export API functions
module.exports = {
  startServer,
  reloadBlacklistData,
  app // Export app for testing
};
