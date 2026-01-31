/**
 * Analytics Controller
 * Handles daily, weekly, and monthly analytics
 */

const mealService = require('../services/meal.service');
const { successResponse, HTTP_STATUS } = require('../utils/responses');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Get daily calorie summary
 * GET /api/analytics/daily
 */
const getDailyAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { date } = req.query;

  // Parse date if provided, otherwise use today
  const targetDate = date ? new Date(date) : new Date();

  const analytics = await mealService.getDailyAnalytics(userId, targetDate);

  // Get user's calorie goal for context
  const calorieGoal = req.user.dailyCalorieGoal || 2000;
  const calorieStatus =
    analytics.consumed < calorieGoal * 0.9
      ? 'under'
      : analytics.consumed > calorieGoal * 1.1
        ? 'over'
        : 'on_track';

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Daily analytics retrieved successfully',
    data: {
      ...analytics,
      status: calorieStatus,
      message: getStatusMessage(calorieStatus, analytics.remaining),
    },
  });
});

/**
 * Get weekly analytics
 * GET /api/analytics/weekly
 */
const getWeeklyAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const analytics = await mealService.getWeeklyAnalytics(userId);

  // Calculate weekly stats
  const weeklyGoal = (req.user.dailyCalorieGoal || 2000) * 7;
  const weeklyProgress = Math.round((analytics.totals.totalCalories / weeklyGoal) * 100);

  // Calculate macro percentages
  const totalMacroCalories =
    (analytics.totals.totalProtein * 4) +
    (analytics.totals.totalCarbs * 4) +
    (analytics.totals.totalFats * 9);

  const macroBreakdown = totalMacroCalories > 0 ? {
    proteinPercentage: Math.round((analytics.totals.totalProtein * 4 / totalMacroCalories) * 100),
    carbsPercentage: Math.round((analytics.totals.totalCarbs * 4 / totalMacroCalories) * 100),
    fatsPercentage: Math.round((analytics.totals.totalFats * 9 / totalMacroCalories) * 100),
  } : {
    proteinPercentage: 0,
    carbsPercentage: 0,
    fatsPercentage: 0,
  };

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Weekly analytics retrieved successfully',
    data: {
      ...analytics,
      weeklyGoal,
      weeklyProgress,
      macroBreakdown,
    },
  });
});

/**
 * Get monthly analytics
 * GET /api/analytics/monthly
 */
const getMonthlyAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const analytics = await mealService.getMonthlyAnalytics(userId);

  // Calculate consistency score (percentage of days tracked)
  const daysInMonth = new Date(
    analytics.endDate.getFullYear(),
    analytics.endDate.getMonth() + 1,
    0
  ).getDate();
  const consistencyScore = Math.round((analytics.daysTracked / daysInMonth) * 100);

  // Calculate macro averages
  const avgProtein = analytics.daysTracked > 0
    ? Math.round(analytics.totals.totalProtein / analytics.daysTracked)
    : 0;
  const avgCarbs = analytics.daysTracked > 0
    ? Math.round(analytics.totals.totalCarbs / analytics.daysTracked)
    : 0;
  const avgFats = analytics.daysTracked > 0
    ? Math.round(analytics.totals.totalFats / analytics.daysTracked)
    : 0;

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Monthly analytics retrieved successfully',
    data: {
      ...analytics,
      consistencyScore,
      daysInMonth,
      averageMacros: {
        protein: avgProtein,
        carbs: avgCarbs,
        fats: avgFats,
      },
    },
  });
});

/**
 * Get progress overview (combines multiple metrics)
 * GET /api/analytics/overview
 */
const getProgressOverview = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all analytics
  const [daily, weekly, monthly] = await Promise.all([
    mealService.getDailyAnalytics(userId),
    mealService.getWeeklyAnalytics(userId),
    mealService.getMonthlyAnalytics(userId),
  ]);

  const calorieGoal = req.user.dailyCalorieGoal || 2000;

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Progress overview retrieved successfully',
    data: {
      today: {
        consumed: daily.consumed,
        goal: calorieGoal,
        remaining: daily.remaining,
        percentConsumed: daily.percentConsumed,
        mealsCount: daily.mealsCount,
      },
      thisWeek: {
        averageCalories: weekly.averageCalories,
        totalMeals: weekly.totals.mealsCount,
        daysTracked: weekly.daysTracked,
      },
      thisMonth: {
        averageCalories: monthly.averageCalories,
        totalMeals: monthly.totals.mealsCount,
        daysTracked: monthly.daysTracked,
        consistencyScore: Math.round((monthly.daysTracked / 30) * 100),
      },
      trends: monthly.weeklyTrends,
    },
  });
});

/**
 * Helper function to generate status message
 */
const getStatusMessage = (status, remaining) => {
  switch (status) {
    case 'under':
      return `You have ${Math.abs(remaining)} calories remaining today.`;
    case 'over':
      return `You are ${Math.abs(remaining)} calories over your goal today.`;
    case 'on_track':
      return "You're right on track with your calorie goal!";
    default:
      return '';
  }
};

module.exports = {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getProgressOverview,
};
