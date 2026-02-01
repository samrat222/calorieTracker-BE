/**
 * Firebase Admin Configuration
 * Initializes Firebase SDK for push notifications
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {Object|null} - Firebase Admin instance or null if not configured
 */
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      return admin.app();
    }

    let serviceAccount = null;

    // 1. Try to get credentials from environment variable (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // 2. Try to load from a file path
    else {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
                                path.join(process.cwd(), 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
      }
    }

    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized successfully');
      return firebaseApp;
    } else {
      console.warn('⚠️ Firebase credentials not found. Push notifications will be disabled.');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    return null;
  }
};

module.exports = {
  admin,
  initializeFirebase,
};
