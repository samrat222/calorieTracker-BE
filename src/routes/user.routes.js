/**
 * User Routes
 * Handles user profile and onboarding
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate, requireOnboarding } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { onboardingSchema, updateProfileSchema } = require('../utils/validators');

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   POST /api/users/onboarding
 * @desc    Complete user onboarding questionnaire
 * @access  Private (must be authenticated but not onboarded)
 */
router.post(
  '/onboarding',
  authenticate,
  validate(onboardingSchema),
  userController.completeOnboarding
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (total meals, days tracked, etc.)
 * @access  Private (requires onboarding)
 */
router.get(
  '/stats',
  authenticate,
  requireOnboarding,
  userController.getUserStats
);

module.exports = router;
