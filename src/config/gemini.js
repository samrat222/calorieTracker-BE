/**
 * Google Gemini API Configuration
 * Used for food image recognition and nutritional analysis
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client
let genAI = null;
let model = null;

/**
 * Initialize the Gemini API client
 * Should be called after environment variables are loaded
 */
const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY not configured. Food image analysis will not work.');
    return null;
  }

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Use gemini-2.5-flash for vision tasks
  model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    },
  });

  console.log('✅ Gemini API initialized successfully');
  return model;
};

/**
 * Get the Gemini model instance
 * @returns {GenerativeModel|null}
 */
const getModel = () => {
  if (!model) {
    initializeGemini();
  }
  return model;
};

/**
 * Check if Gemini is configured
 * @returns {boolean}
 */
const isConfigured = () => {
  return !!process.env.GEMINI_API_KEY;
};

module.exports = {
  initializeGemini,
  getModel,
  isConfigured,
};
