// API endpoint for managing receiver data (name and email)
const express = require("express");
const router = express.Router();
const { db } = require("../configs/firebase");

// Get receiver data for a user
router.get("/:userId", async (req, res) => {
  const startTime = Date.now();
  console.log(`📥 GET /api/receiver-data/${req.params.userId} - Request received`);
  
  try {
    const { userId } = req.params;
    console.log(`🔍 Checking Firebase database initialization...`);

    if (!db) {
      console.error('❌ Firebase database is not initialized');
      return res.status(500).json({
        success: false,
        error: "Firebase database not initialized",
      });
    }

    console.log(`✅ Firebase database is initialized, fetching data for user: ${userId}`);
    const receiverRef = db.ref(`users/${userId}/receiver`);
    
    console.log(`⏳ Waiting for Firebase snapshot...`);
    
    // Add timeout wrapper for Firebase operation (5 seconds max - reduced from 8)
    const firebasePromise = receiverRef.once("value");
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error(`⏱️ Firebase operation timed out after 5 seconds for user: ${userId}`);
        reject(new Error("Firebase database connection timeout. Please check your network connection and Firebase Realtime Database availability."));
      }, 5000);
    });
    
    let snapshot;
    try {
      snapshot = await Promise.race([firebasePromise, timeoutPromise]);
      clearTimeout(timeoutId); // Clear timeout if promise resolves
      console.log(`✅ Firebase snapshot received (took ${Date.now() - startTime}ms)`);
    } catch (raceError) {
      clearTimeout(timeoutId);
      // If Firebase operation fails or times out, return null data instead of error
      // This allows the app to continue (user will be treated as new user)
      console.warn(`⚠️ Firebase operation failed, returning null data to allow app to continue:`, raceError.message);
      return res.json({
        success: true,
        data: null,
        message: "No receiver data found (database connection issue)",
      });
    }
    
    const receiverData = snapshot.val();

    if (!receiverData) {
      console.log(`ℹ️ No receiver data found for user: ${userId}`);
      return res.json({
        success: true,
        data: null,
        message: "No receiver data found",
      });
    }

    console.log(`✅ Returning receiver data for user: ${userId} (took ${Date.now() - startTime}ms total)`);
    return res.json({
      success: true,
      data: receiverData,
    });
  } catch (error) {
    console.error(`❌ Unexpected error fetching receiver data (took ${Date.now() - startTime}ms):`, error);
    console.error("Error stack:", error.stack);
    
    // Return null data instead of error to allow app to continue
    // The frontend will treat this as a new user
    return res.json({
      success: true,
      data: null,
      message: "Database connection issue - treating as new user",
    });
  }
});

// Save receiver data for a user
router.post("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    console.log(`📥 POST /api/receiver-data/${userId}`, { name, email });

    if (!name || !email) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: "Name and email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    if (!db) {
      console.error('❌ Firebase database not initialized');
      return res.status(500).json({
        success: false,
        error: "Firebase database not initialized",
      });
    }

    const receiverData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`💾 Attempting to save to Firebase: users/${userId}/receiver`);
    console.log(`💾 Data to save:`, receiverData);
    
    const receiverRef = db.ref(`users/${userId}/receiver`);
    
    try {
      // Use set() with Promise wrapper for better error handling
      await new Promise((resolve, reject) => {
        receiverRef.set(receiverData, (error) => {
          if (error) {
            console.error('❌ Firebase set() error:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Full error:', JSON.stringify(error, null, 2));
            reject(error);
          } else {
            console.log(`✅ Firebase set() completed for user ${userId}`);
            resolve();
          }
        });
      });
      
      // Wait for write to propagate
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify the save by reading it back
      console.log(`🔍 Verifying save by reading back...`);
      const snapshot = await receiverRef.once("value");
      const savedData = snapshot.val();
      
      if (savedData) {
        console.log(`✅ Receiver data saved and verified for user ${userId}:`, savedData);
        return res.json({
          success: true,
          data: savedData,
          message: "Receiver data saved successfully",
        });
      } else {
        console.warn(`⚠️ Data not found after save. This might be a timing issue.`);
        // Return success anyway - the write might have succeeded but read is delayed
        return res.json({
          success: true,
          data: receiverData,
          message: "Receiver data save initiated (verification pending)",
        });
      }
    } catch (firebaseError) {
      console.error('❌ Firebase error during save:', firebaseError);
      console.error('❌ Error code:', firebaseError.code);
      console.error('❌ Error message:', firebaseError.message);
      console.error('❌ Error details:', {
        name: firebaseError.name,
        stack: firebaseError.stack
      });
      throw firebaseError;
    }
  } catch (error) {
    console.error("❌ Error saving receiver data:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update receiver data
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Firebase database not initialized",
      });
    }

    const receiverRef = db.ref(`users/${userId}/receiver`);
    const snapshot = await receiverRef.once("value");
    const existingData = snapshot.val();

    if (!existingData) {
      return res.status(404).json({
        success: false,
        error: "Receiver data not found. Use POST to create.",
      });
    }

    const updateData = {
      ...existingData,
      updatedAt: new Date().toISOString(),
    };

    if (name) {
      updateData.name = name.trim();
    }

    if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Invalid email format",
        });
      }
      updateData.email = email.trim().toLowerCase();
    }

    await receiverRef.update(updateData);

    return res.json({
      success: true,
      data: updateData,
      message: "Receiver data updated successfully",
    });
  } catch (error) {
    console.error("Error updating receiver data:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

