/**
 * Application Constants
 * Centralized storage for constant values used throughout the application
 */

// ============================================
// Meal Types
// ============================================
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// ============================================
// Gender Options
// ============================================
const GENDERS = ['male', 'female'];

// ============================================
// Activity Levels (Harris-Benedict multipliers)
// ============================================
const ACTIVITY_LEVELS = {
  SEDENTARY: 1.2,           // Little or no exercise
  LIGHTLY_ACTIVE: 1.375,    // Light exercise 1-3 days/week
  MODERATELY_ACTIVE: 1.55,  // Moderate exercise 3-5 days/week
  VERY_ACTIVE: 1.725,       // Hard exercise 6-7 days/week
  EXTRA_ACTIVE: 1.9,        // Very hard exercise, physical job
};

// Human-readable activity level descriptions
const ACTIVITY_LEVEL_DESCRIPTIONS = {
  1.2: 'Sedentary (little or no exercise)',
  1.375: 'Lightly active (light exercise 1-3 days/week)',
  1.55: 'Moderately active (moderate exercise 3-5 days/week)',
  1.725: 'Very active (hard exercise 6-7 days/week)',
  1.9: 'Extra active (very hard exercise, physical job)',
};

// ============================================
// Food Units
// ============================================
const FOOD_UNITS = ['grams', 'g', 'ml', 'oz', 'pieces', 'cups', 'tbsp', 'tsp', 'serving'];

// ============================================
// Date Utilities
// ============================================

/**
 * Get the start of today (midnight)
 * @returns {Date}
 */
const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Get the end of today (23:59:59.999)
 * @returns {Date}
 */
const getEndOfToday = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

/**
 * Get the start of the current week (Monday)
 * @returns {Date}
 */
const getStartOfWeek = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Get the end of the current week (Sunday)
 * @returns {Date}
 */
const getEndOfWeek = () => {
  const startOfWeek = getStartOfWeek();
  const sunday = new Date(startOfWeek);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

/**
 * Get the start of the current month
 * @returns {Date}
 */
const getStartOfMonth = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
};

/**
 * Get the end of the current month
 * @returns {Date}
 */
const getEndOfMonth = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
};

/**
 * Get date range for the last N days
 * @param {number} days - Number of days to go back
 * @returns {{ startDate: Date, endDate: Date }}
 */
const getLastNDays = (days) => {
  const endDate = getEndOfToday();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
};

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
const formatDateYMD = (date) => {
  return date.toISOString().split('T')[0];
};

// ============================================
// Pagination Defaults
// ============================================
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// ============================================
// Error Codes
// ============================================
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
  CLOUDINARY_ERROR: 'CLOUDINARY_ERROR',
};

module.exports = {
  MEAL_TYPES,
  GENDERS,
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_DESCRIPTIONS,
  FOOD_UNITS,
  getStartOfToday,
  getEndOfToday,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getLastNDays,
  formatDateYMD,
  PAGINATION,
  ERROR_CODES,
};
