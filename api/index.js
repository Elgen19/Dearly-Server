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
  
  // Wrap the Express app for Vercel serverless functions
  // This ensures CORS headers are set even if middleware doesn't run
  module.exports = (req, res) => {
    // Handle CORS at the function level (before Express)
    const origin = req.headers.origin;
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['https://dearly-tau.vercel.app'];
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Max-Age', '86400');
      }
      return res.status(204).end();
    }
    
    // Set CORS headers for all requests
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Pass to Express app
    return app(req, res);
  };
} catch (error) {
  console.error('❌ Failed to initialize Express app:', error);
  // Export a minimal error handler with CORS
  module.exports = (req, res) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(500).json({
      success: false,
      error: 'Server initialization failed',
      message: error.message
    });
  };
}
