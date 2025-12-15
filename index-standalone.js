// Standalone Express Server - No Serverless Dependencies
// Use this for Railway, Render, or any traditional hosting
// This is a clean, simple Express server with no Vercel-specific code

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

// CORS Configuration - Simple and Reliable
const allowedOrigins = NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(origin => origin) : ['https://dearly-tau.vercel.app'])
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

console.log('🌐 CORS Allowed Origins:', allowedOrigins);

// CORS Middleware - Simple and Effective
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list (case-insensitive)
    const isAllowed = allowedOrigins.some(allowed => {
      return origin.toLowerCase() === allowed.toLowerCase();
    });
    
    if (isAllowed || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
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
app.use("/api/notifications", notificationsRoutes);
app.use("/api/game-prizes", gamePrizesRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/receiver-accounts", receiverAccountsRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Dearly API Server",
    version: "1.0.0",
    environment: NODE_ENV,
    endpoints: {
      auth: "/api/auth",
      receiverData: "/api/receiver-data",
      letters: "/api/letters",
      dateInvitations: "/api/date-invitations"
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} (${NODE_ENV})`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
  
  // Initialize email scheduler
  initializeEmailScheduler();
  
  console.log('🚀 Server ready to accept requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;

