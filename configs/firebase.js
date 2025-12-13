// Firebase Admin SDK Configuration
require('dotenv').config();

let admin = null;
let db = null;
let storage = null;

try {
  admin = require("firebase-admin");
} catch (error) {
  console.warn("⚠️ firebase-admin package not installed. Run 'npm install' in letter-server directory.");
  module.exports = { admin: null, db: null };
  return;
}

// Initialize Firebase Admin SDK
// Option 1: Using service account JSON file (recommended for local dev)
// Uncomment and update path if using service account file:
/*
const serviceAccount = require("../path-to-your-service-account-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
*/

// Option 2: Using environment variables (recommended for production)
// Set these in your .env file:
// FIREBASE_PROJECT_ID=your-project-id
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
// FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
// FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    console.log("🔧 Initializing Firebase Admin SDK...");
    console.log("📋 Firebase Config:", {
      projectId: process.env.FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? "✅ Set" : "❌ Missing",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "✅ Set" : "❌ Missing",
      databaseURL: process.env.FIREBASE_DATABASE_URL ? `✅ ${process.env.FIREBASE_DATABASE_URL}` : "❌ Missing",
    });
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    db = admin.database();
    
    if (!db) {
      console.error("❌ Firebase database() returned null");
    } else {
      console.log("✅ Firebase Database initialized successfully");
    }
    
    // Initialize Firebase Storage if bucket is configured
    if (process.env.FIREBASE_STORAGE_BUCKET) {
      try {
        storage = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        console.log(`✅ Firebase Storage initialized successfully with bucket: ${process.env.FIREBASE_STORAGE_BUCKET}`);
      } catch (error) {
        console.error("❌ Error initializing Firebase Storage:", error);
        console.error("❌ Error details:", {
          message: error.message,
          bucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        storage = null;
      }
    } else {
      console.warn("⚠️ FIREBASE_STORAGE_BUCKET not set in .env file. File uploads will not work.");
    }
    
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error);
    console.error("❌ Error stack:", error.stack);
    db = null;
  }
} else {
  console.warn("⚠️ Firebase credentials not found. Date invitation features will not work.");
  console.warn("⚠️ Required env vars: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_DATABASE_URL");
}

module.exports = { admin, db, storage };

