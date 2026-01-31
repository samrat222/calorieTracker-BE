/**
 * Analytics Routes
 * Handles daily, weekly, and monthly analytics
 */

const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const { authenticate, requireOnboarding } = require('../middlewares/auth.middleware');

// All analytics routes require authentication and onboarding
router.use(authenticate);
router.use(requireOnboarding);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get progress overview (combines daily, weekly, monthly)
 * @access  Private
 */
router.get('/overview', analyticsController.getProgressOverview);

/**
 * @route   GET /api/analytics/daily
 * @desc    Get daily calorie summary
 * @access  Private
 * @query   date - Optional date (YYYY-MM-DD), defaults to today
 */
router.get('/daily', analyticsController.getDailyAnalytics);

/**
 * @route   GET /api/analytics/weekly
 * @desc    Get weekly analytics and trends
 * @access  Private
 */
router.get('/weekly', analyticsController.getWeeklyAnalytics);

/**
 * @route   GET /api/analytics/monthly
 * @desc    Get monthly analytics and trends
 * @access  Private
 */
router.get('/monthly', analyticsController.getMonthlyAnalytics);

module.exports = router;
