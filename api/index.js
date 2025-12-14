// Vercel serverless function entry point
// This exports the Express app for Vercel's serverless environment

// Set Vercel environment flag before requiring index
process.env.VERCEL = '1';

// Set NODE_ENV to production if not already set (Vercel may not set this)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

try {
  const app = require('../index');
  
  // Export the Express app for Vercel
  module.exports = app;
} catch (error) {
  console.error('❌ Failed to initialize Express app:', error);
  // Export a minimal error handler
  const express = require('express');
  const errorApp = express();
  errorApp.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'Server initialization failed',
      message: error.message
    });
  });
  module.exports = errorApp;
}
