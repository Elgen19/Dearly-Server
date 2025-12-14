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
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security: Validate required environment variables
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_DATABASE_URL'];
if (NODE_ENV === 'production') {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }
}

// Security: Add security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false, // Disable in dev for easier debugging
  crossOriginEmbedderPolicy: false // Allow embedding if needed
}));

// Security: Configure CORS - restrict to production domain in production
const allowedOrigins = NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(origin => origin) : [])
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

if (NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('❌ CRITICAL: ALLOWED_ORIGINS environment variable must be set in production');
  console.error('   Example: ALLOWED_ORIGINS=https://dearly-tau.vercel.app,https://www.dearly-tau.vercel.app');
  process.exit(1);
}

// Log allowed origins in production for debugging
if (NODE_ENV === 'production') {
  console.log('🌐 CORS Allowed Origins:', allowedOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed;
    });
    
    if (isAllowed || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
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

// Log registered routes for debugging (only in development)
if (NODE_ENV === 'development') {
  console.log('📋 Registered API routes:');
  console.log('  - POST /api/auth/save-google-user');
  console.log('  - GET /api/auth/check-verification/:userId');
}

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
