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

// Security: Configure CORS - restrict to production domain in production
// MUST be before helmet to ensure CORS headers are set
const allowedOrigins = NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(origin => origin) : [])
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// Add default production origin if not set (for backward compatibility)
if (NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn('⚠️ WARNING: ALLOWED_ORIGINS environment variable not set in production');
  console.warn('   Defaulting to: https://dearly-tau.vercel.app');
  console.warn('   Please set ALLOWED_ORIGINS in Vercel environment variables');
  allowedOrigins.push('https://dearly-tau.vercel.app');
}

// Log allowed origins for debugging
console.log('🌐 CORS Allowed Origins:', allowedOrigins.length > 0 ? allowedOrigins : 'None (will allow all in dev)');

// Explicit OPTIONS handler for preflight requests (must be before CORS middleware)
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (!origin) {
    return res.status(204).end();
  }
  
  const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
  const isAllowed = allowedOrigins.some(allowed => {
    const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
    return normalizedOrigin === normalizedAllowed;
  }) || NODE_ENV === 'development';
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    console.log(`✅ OPTIONS preflight allowed for origin: ${origin}`);
  } else {
    console.warn(`⚠️ OPTIONS preflight blocked for origin: ${origin}`);
  }
  res.status(204).end();
});

// Security: Add security headers (after CORS setup)
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false, // Disable in dev for easier debugging
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin requests
}));

// CORS configuration with explicit preflight handling
// Add logging middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS' || origin) {
    console.log(`🌐 ${req.method} ${req.path} - Origin: ${origin || 'none'}`);
  }
  next();
});

// Apply CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize origin (remove trailing slash and protocol variations)
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    
    // Check if origin is in allowed list (case-insensitive)
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
      return normalizedOrigin === normalizedAllowed;
    });
    
    if (isAllowed || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      console.warn(`   Normalized: ${normalizedOrigin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Additional CORS headers middleware (ensures headers are set even if cors middleware fails)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
      return normalizedOrigin === normalizedAllowed;
    }) || NODE_ENV === 'development';
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  next();
});

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
