// Vercel serverless function entry point
// This exports the Express app for Vercel's serverless environment

// Set Vercel environment flag before requiring index
process.env.VERCEL = '1';

// Set NODE_ENV to production if not already set (Vercel may not set this)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Get allowed origins
const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  return ['https://dearly-tau.vercel.app'];
};

// CORS handler function
const handleCORS = (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // Check if origin is allowed (case-insensitive)
  const isAllowed = origin && allowedOrigins.some(allowed => {
    return origin.toLowerCase() === allowed.toLowerCase();
  });
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    console.log(`✅ OPTIONS preflight handled for: ${origin || 'no origin'}`);
    return res.status(204).end();
  }
  
  return false; // Not an OPTIONS request, continue
};

try {
  const app = require('../index');
  
  // Export handler that wraps Express app
  module.exports = async (req, res) => {
    // Handle CORS FIRST, before anything else
    const corsHandled = handleCORS(req, res);
    if (corsHandled === false) {
      // Not OPTIONS, continue to Express
      return app(req, res);
    }
    // OPTIONS was handled, response already sent
  };
} catch (error) {
  console.error('❌ Failed to initialize Express app:', error);
  // Export a minimal error handler with CORS
  module.exports = (req, res) => {
    handleCORS(req, res);
    if (req.method !== 'OPTIONS') {
      res.status(500).json({
        success: false,
        error: 'Server initialization failed',
        message: error.message
      });
    }
  };
}
