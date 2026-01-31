/**
 * User Controller
 * Handles user profile management and onboarding
 */

const { prisma } = require("../config/database");
const { calculateHealthMetrics } = require("../services/bmi.service");
const {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} = require("../utils/responses");
const {
  ERROR_CODES,
  ACTIVITY_LEVEL_DESCRIPTIONS,
} = require("../utils/constants");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * Get user profile
 * GET /api/users/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      weight: true,
      height: true,
      gender: true,
      activityLevel: true,
      bmi: true,
      dailyCalorieGoal: true,
      isOnboarded: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.NOT_FOUND.code,
      message: "User not found",
      code: ERROR_CODES.NOT_FOUND,
    });
  }

  // Add activity level description
  const activityLevelDescription = user.activityLevel
    ? ACTIVITY_LEVEL_DESCRIPTIONS[user.activityLevel] || "Unknown"
    : null;

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Profile retrieved successfully",
    data: {
      ...user,
      activityLevelDescription,
    },
  });
});

/**
 * Update user profile
 * PUT /api/users/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, age, weight, height, gender, activityLevel } = req.body;

  // Get current user data
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.NOT_FOUND.code,
      message: "User not found",
      code: ERROR_CODES.NOT_FOUND,
    });
  }

  // Build update data
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (age !== undefined) updateData.age = age;
  if (weight !== undefined) updateData.weight = weight;
  if (height !== undefined) updateData.height = height;
  if (gender !== undefined) updateData.gender = gender;
  if (activityLevel !== undefined) updateData.activityLevel = activityLevel;

  // Recalculate health metrics if any relevant field changed
  const finalWeight = weight ?? currentUser.weight;
  const finalHeight = height ?? currentUser.height;
  const finalAge = age ?? currentUser.age;
  const finalGender = gender ?? currentUser.gender;
  const finalActivityLevel = activityLevel ?? currentUser.activityLevel;

  if (
    finalWeight &&
    finalHeight &&
    finalAge &&
    finalGender &&
    finalActivityLevel
  ) {
    const metrics = calculateHealthMetrics({
      weight: finalWeight,
      height: finalHeight,
      age: finalAge,
      gender: finalGender,
      activityLevel: finalActivityLevel,
    });

    updateData.bmi = metrics.bmi;
    updateData.dailyCalorieGoal = metrics.dailyCalorieGoal;
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      weight: true,
      height: true,
      gender: true,
      activityLevel: true,
      bmi: true,
      dailyCalorieGoal: true,
      isOnboarded: true,
      updatedAt: true,
    },
  });

  // Add activity level description
  const activityLevelDescription = updatedUser.activityLevel
    ? ACTIVITY_LEVEL_DESCRIPTIONS[updatedUser.activityLevel] || "Unknown"
    : null;

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Profile updated successfully",
    data: {
      ...updatedUser,
      activityLevelDescription,
    },
  });
});

/**
 * Complete onboarding questionnaire
 * POST /api/users/onboarding
 */
const completeOnboarding = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, age, weight, height, gender, activityLevel } = req.body;

  // Check if already onboarded - only fetch the field we need
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isOnboarded: true },
  });

  if (currentUser?.isOnboarded) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST.code,
      message:
        "User has already completed onboarding. Use profile update instead.",
    });
  }

  // Calculate health metrics
  const metrics = calculateHealthMetrics({
    weight,
    height,
    age,
    gender,
    activityLevel,
  });

  // Update user with onboarding data
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      age,
      weight,
      height,
      gender,
      activityLevel,
      bmi: metrics.bmi,
      dailyCalorieGoal: metrics.dailyCalorieGoal,
      isOnboarded: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      weight: true,
      height: true,
      gender: true,
      activityLevel: true,
      bmi: true,
      dailyCalorieGoal: true,
      isOnboarded: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Build response with calculated data
  const activityLevelDescription =
    ACTIVITY_LEVEL_DESCRIPTIONS[activityLevel] || "Unknown";

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Onboarding completed successfully",
    data: {
      user: {
        ...updatedUser,
        activityLevelDescription,
      },
      healthMetrics: {
        bmi: metrics.bmi,
        bmiCategory: metrics.bmiCategory,
        bmr: metrics.bmr,
        dailyCalorieGoal: metrics.dailyCalorieGoal,
      },
    },
  });
});

/**
 * Get user statistics
 * GET /api/users/stats
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Run all stats queries in parallel for better performance
  const [totalMeals, uniqueDays, user] = await Promise.all([
    prisma.meal.count({
      where: { userId },
    }),
    prisma.dailySummary.count({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyCalorieGoal: true,
        bmi: true,
        createdAt: true,
      },
    }),
  ]);

  // Calculate member since (days)
  const memberSinceDays = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "User statistics retrieved successfully",
    data: {
      totalMeals,
      daysTracked: uniqueDays,
      memberSinceDays,
      dailyCalorieGoal: user.dailyCalorieGoal,
      currentBMI: user.bmi,
    },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  completeOnboarding,
  getUserStats,
};
