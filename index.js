const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const emailRoutes = require("./routes/send-email");
const dateInvitationsRoutes = require("./routes/date-invitations");
const emailVerificationRoutes = require("./routes/email-verification");
const authRoutes = require("./routes/auth");
const receiverDataRoutes = require("./routes/receiver-data");
const lettersRoutes = require("./routes/letters");
const musicUploadRoutes = require("./routes/music-upload");
const letterEmailRoutes = require("./routes/letter-email");
const voiceUploadRoutes = require("./routes/voice-upload");
const audioProxyRoutes = require("./routes/audio-proxy");
const notificationsRoutes = require("./routes/notifications");
const gamePrizesRoutes = require("./routes/game-prizes");
const quizzesRoutes = require("./routes/quizzes");
const gamesRoutes = require("./routes/games");
const receiverAccountsRoutes = require("./routes/receiver-accounts");
const { initializeEmailScheduler } = require("./jobs/emailScheduler");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
// Vercel sets VERCEL=1, so check for that too. Also check if we're in a serverless environment
const NODE_ENV = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production' 
  ? 'production' 
  : (process.env.NODE_ENV || 'development');

// CORS MUST be the very first middleware - before anything else
// Security: Configure CORS - SIMPLIFIED for Vercel serverless
const allowedOrigins = NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(origin => origin) : [])
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// Add default production origin if not set
if (NODE_ENV === 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('https://dearly-tau.vercel.app');
}

console.log('🌐 CORS Allowed Origins:', allowedOrigins);

// Simple CORS middleware - handles all requests including OPTIONS
// MUST be first middleware to catch all requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log all requests for debugging
  if (req.method === 'OPTIONS' || origin) {
    console.log(`🔍 ${req.method} ${req.path} - Origin: ${origin || 'none'}`);
  }
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    if (origin) {
      const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
      const isAllowed = allowedOrigins.some(allowed => {
        return normalizedOrigin === allowed.replace(/\/$/, '').toLowerCase();
      }) || NODE_ENV === 'development';
      
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Max-Age', '86400');
        console.log(`✅ OPTIONS preflight allowed for: ${origin}`);
        return res.status(204).end();
      } else {
        console.warn(`⚠️ OPTIONS preflight blocked for: ${origin}`);
      }
    }
    // Always respond to OPTIONS, even without origin
    res.status(204).end();
    return;
  }
  
  // Handle regular requests - set CORS headers
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    const isAllowed = allowedOrigins.some(allowed => {
      return normalizedOrigin === allowed.replace(/\/$/, '').toLowerCase();
    }) || NODE_ENV === 'development';
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  next();
});

// Security: Validate required environment variables
// Don't exit in serverless functions - just log errors
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_DATABASE_URL'];
if (NODE_ENV === 'production') {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:', missingVars.join(', '));
    // Don't exit in serverless functions - Vercel will handle the error
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
  }
}

// Security: Add security headers (configured to not interfere with CORS)
app.use(helmet({
  contentSecurityPolicy: false, // Disable to avoid conflicts
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(express.json()); // Express 5.x has built-in JSON parsing

// Serve uploaded music files as static files
// Files will be accessible at: http://your-server:5000/uploads/music/filename
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/send-email", emailRoutes);
app.use("/api/date-invitations", dateInvitationsRoutes);
app.use("/api/email-verification", emailVerificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/receiver-data", receiverDataRoutes);
app.use("/api/letters", lettersRoutes);
app.use("/api/music-upload", musicUploadRoutes);
app.use("/api/letter-email", letterEmailRoutes);
app.use("/api/voice-upload", voiceUploadRoutes);
app.use("/api/audio-proxy", audioProxyRoutes);
// Security: Disable debug/test endpoints in production
if (NODE_ENV === 'development') {
  const pdfTestRoutes = require("./routes/pdf-test");
  app.use("/api/pdf-test", pdfTestRoutes);
}
app.use("/api/notifications", notificationsRoutes);
app.use("/api/game-prizes", gamePrizesRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/receiver-accounts", receiverAccountsRoutes);

// Cron job endpoint (can be called via Express or Vercel Cron)
const emailSchedulerHandler = require("./api/cron/email-scheduler");
app.get("/api/cron/email-scheduler", emailSchedulerHandler);

// Root route - API information
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Dearly API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      receiverData: "/api/receiver-data",
      letters: "/api/letters",
      dateInvitations: "/api/date-invitations"
    }
  });
});

// Log registered routes for debugging (only in development)
if (NODE_ENV === 'development') {
  console.log('📋 Registered API routes:');
  console.log('  - POST /api/auth/save-google-user');
  console.log('  - GET /api/auth/check-verification/:userId');
}

// Global error handler to prevent crashes
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Export app for Vercel serverless functions
// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  // Start server (for local development or traditional hosting)
  app.listen(PORT, () => {
    if (NODE_ENV === 'development') {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    } else {
      console.log(`✅ Server running on port ${PORT} (${NODE_ENV})`);
    }
    
    // Initialize email scheduler cron job (only for traditional server)
    initializeEmailScheduler();
  });
} else {
  // In Vercel, initialize scheduler on cold start
  // Note: Cron jobs should be handled via Vercel Cron Jobs (see vercel.json)
  if (NODE_ENV === 'development') {
    console.log('✅ Express app ready for Vercel serverless');
  }
}

// Export the Express app for Vercel
module.exports = app;
