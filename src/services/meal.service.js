/**
 * Meal Service
 * Business logic for meal CRUD operations and analytics
 */

const { prisma } = require('../config/database');
const {
  getStartOfToday,
  getEndOfToday,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  PAGINATION,
} = require('../utils/constants');

/**
 * Create a new meal entry
 * @param {Object} mealData - Meal data
 * @param {string} mealData.userId - User ID
 * @param {string} mealData.mealType - Type of meal
 * @param {string} [mealData.description] - Meal description
 * @param {string} [mealData.imageUrl] - Image URL
 * @param {number} mealData.totalCalories - Total calories
 * @param {number} [mealData.protein] - Protein in grams
 * @param {number} [mealData.carbs] - Carbs in grams
 * @param {number} [mealData.fats] - Fats in grams
 * @param {number} [mealData.fiber] - Fiber in grams
 * @param {Date} [mealData.mealDate] - Date of the meal
 * @param {Array} [mealData.foodItems] - Array of food items
 * @returns {Promise<Object>} - Created meal
 */
const createMeal = async (mealData) => {
  const { userId, mealType, description, imageUrl, totalCalories, protein, carbs, fats, fiber, mealDate, foodItems } = mealData;

  const meal = await prisma.meal.create({
    data: {
      userId,
      mealType,
      description,
      imageUrl,
      totalCalories,
      protein,
      carbs,
      fats,
      fiber,
      mealDate: mealDate || new Date(),
      foodItems: foodItems && foodItems.length > 0 ? {
        create: foodItems.map((item) => ({
          foodName: item.foodName,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
        })),
      } : undefined,
    },
    include: {
      foodItems: true,
    },
  });

  // Update daily summary after creating meal
  await updateDailySummary(userId, mealDate || new Date());

  return meal;
};

/**
 * Get a meal by ID
 * @param {string} mealId - Meal ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} - Meal or null
 */
const getMealById = async (mealId, userId) => {
  return prisma.meal.findFirst({
    where: {
      id: mealId,
      userId,
    },
    include: {
      foodItems: true,
    },
  });
};

/**
 * Get all meals for a user with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=10] - Items per page
 * @param {Date} [options.startDate] - Filter start date
 * @param {Date} [options.endDate] - Filter end date
 * @param {string} [options.mealType] - Filter by meal type
 * @returns {Promise<Object>} - Paginated meals
 */
const getMeals = async (userId, options = {}) => {
  const page = Math.max(1, options.page || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, options.limit || PAGINATION.DEFAULT_LIMIT),
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Build where clause
  const where = { userId };

  if (options.startDate || options.endDate) {
    where.mealDate = {};
    if (options.startDate) {
      where.mealDate.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      where.mealDate.lte = new Date(options.endDate);
    }
  }

  if (options.mealType) {
    where.mealType = options.mealType;
  }

  // Get total count
  const total = await prisma.meal.count({ where });

  // Get paginated meals
  const meals = await prisma.meal.findMany({
    where,
    include: {
      foodItems: true,
    },
    orderBy: {
      mealDate: 'desc',
    },
    skip,
    take: limit,
  });

  return {
    meals,
    total,
    page,
    limit,
  };
};

/**
 * Get today's meals for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Today's meals and summary
 */
const getTodaysMeals = async (userId) => {
  const startOfDay = getStartOfToday();
  const endOfDay = getEndOfToday();

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      mealDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      foodItems: true,
    },
    orderBy: {
      mealDate: 'asc',
    },
  });

  // Calculate totals
  const totals = meals.reduce(
    (acc, meal) => {
      acc.totalCalories += meal.totalCalories || 0;
      acc.totalProtein += meal.protein || 0;
      acc.totalCarbs += meal.carbs || 0;
      acc.totalFats += meal.fats || 0;
      acc.totalFiber += meal.fiber || 0;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0 }
  );

  return {
    meals,
    totals,
    mealsCount: meals.length,
    date: startOfDay,
  };
};

/**
 * Update a meal
 * @param {string} mealId - Meal ID
 * @param {string} userId - User ID (for authorization)
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} - Updated meal or null
 */
const updateMeal = async (mealId, userId, updateData) => {
  // First verify the meal belongs to the user
  const existingMeal = await getMealById(mealId, userId);
  if (!existingMeal) {
    return null;
  }

  const { foodItems, ...mealData } = updateData;

  // Start a transaction
  const updatedMeal = await prisma.$transaction(async (tx) => {
    // Update the meal
    const meal = await tx.meal.update({
      where: { id: mealId },
      data: mealData,
    });

    // If food items are provided, replace them
    if (foodItems !== undefined) {
      // Delete existing food items
      await tx.foodItem.deleteMany({
        where: { mealId },
      });

      // Create new food items if provided
      if (foodItems && foodItems.length > 0) {
        await tx.foodItem.createMany({
          data: foodItems.map((item) => ({
            mealId,
            foodName: item.foodName,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
          })),
        });
      }
    }

    // Return updated meal with food items
    return tx.meal.findUnique({
      where: { id: mealId },
      include: { foodItems: true },
    });
  });

  // Update daily summary
  await updateDailySummary(userId, existingMeal.mealDate);

  return updatedMeal;
};

/**
 * Delete a meal
 * @param {string} mealId - Meal ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} - Deleted meal or null
 */
const deleteMeal = async (mealId, userId) => {
  const existingMeal = await getMealById(mealId, userId);
  if (!existingMeal) {
    return null;
  }

  const deletedMeal = await prisma.meal.delete({
    where: { id: mealId },
  });

  // Update daily summary
  await updateDailySummary(userId, existingMeal.mealDate);

  return deletedMeal;
};

/**
 * Update or create daily summary for a user
 * @param {string} userId - User ID
 * @param {Date} date - Date to update
 * @returns {Promise<Object>} - Updated summary
 */
const updateDailySummary = async (userId, date) => {
  // Get start and end of the day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Aggregate meals for the day
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      mealDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  // Get user's calorie goal
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalorieGoal: true },
  });

  const totals = meals.reduce(
    (acc, meal) => {
      acc.totalCalories += meal.totalCalories || 0;
      acc.totalProtein += meal.protein || 0;
      acc.totalCarbs += meal.carbs || 0;
      acc.totalFats += meal.fats || 0;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
  );

  // Upsert daily summary
  return prisma.dailySummary.upsert({
    where: {
      userId_date: {
        userId,
        date: dayStart,
      },
    },
    update: {
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalCarbs: totals.totalCarbs,
      totalFats: totals.totalFats,
      calorieGoal: user?.dailyCalorieGoal || 2000,
      mealsCount: meals.length,
    },
    create: {
      userId,
      date: dayStart,
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalCarbs: totals.totalCarbs,
      totalFats: totals.totalFats,
      calorieGoal: user?.dailyCalorieGoal || 2000,
      mealsCount: meals.length,
    },
  });
};

/**
 * Get daily analytics for a user
 * @param {string} userId - User ID
 * @param {Date} [date] - Date (defaults to today)
 * @returns {Promise<Object>} - Daily analytics
 */
const getDailyAnalytics = async (userId, date = new Date()) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  // Get user's goal
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalorieGoal: true },
  });

  // Get daily summary
  const summary = await prisma.dailySummary.findUnique({
    where: {
      userId_date: {
        userId,
        date: dayStart,
      },
    },
  });

  const calorieGoal = user?.dailyCalorieGoal || 2000;
  const consumed = summary?.totalCalories || 0;
  const remaining = calorieGoal - consumed;
  const percentConsumed = Math.round((consumed / calorieGoal) * 100);

  return {
    date: dayStart,
    calorieGoal,
    consumed,
    remaining,
    percentConsumed,
    macros: {
      protein: summary?.totalProtein || 0,
      carbs: summary?.totalCarbs || 0,
      fats: summary?.totalFats || 0,
    },
    mealsCount: summary?.mealsCount || 0,
  };
};

/**
 * Get weekly analytics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Weekly analytics
 */
const getWeeklyAnalytics = async (userId) => {
  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();

  const summaries = await prisma.dailySummary.findMany({
    where: {
      userId,
      date: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Get user's goal
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalorieGoal: true },
  });

  const weeklyTotals = summaries.reduce(
    (acc, day) => {
      acc.totalCalories += day.totalCalories;
      acc.totalProtein += day.totalProtein;
      acc.totalCarbs += day.totalCarbs;
      acc.totalFats += day.totalFats;
      acc.mealsCount += day.mealsCount;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, mealsCount: 0 }
  );

  const daysTracked = summaries.length;
  const avgCalories = daysTracked > 0 ? Math.round(weeklyTotals.totalCalories / daysTracked) : 0;

  return {
    startDate: startOfWeek,
    endDate: endOfWeek,
    dailyCalorieGoal: user?.dailyCalorieGoal || 2000,
    averageCalories: avgCalories,
    totals: weeklyTotals,
    daysTracked,
    dailyBreakdown: summaries,
  };
};

/**
 * Get monthly analytics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Monthly analytics
 */
const getMonthlyAnalytics = async (userId) => {
  const startOfMonth = getStartOfMonth();
  const endOfMonth = getEndOfMonth();

  const summaries = await prisma.dailySummary.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Get user's goal
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalorieGoal: true },
  });

  const monthlyTotals = summaries.reduce(
    (acc, day) => {
      acc.totalCalories += day.totalCalories;
      acc.totalProtein += day.totalProtein;
      acc.totalCarbs += day.totalCarbs;
      acc.totalFats += day.totalFats;
      acc.mealsCount += day.mealsCount;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, mealsCount: 0 }
  );

  const daysTracked = summaries.length;
  const avgCalories = daysTracked > 0 ? Math.round(monthlyTotals.totalCalories / daysTracked) : 0;

  // Calculate weekly averages for trend
  const weeklyData = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(startOfMonth);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekSummaries = summaries.filter(
      (s) => s.date >= weekStart && s.date <= weekEnd
    );
    const weekCalories = weekSummaries.reduce((sum, s) => sum + s.totalCalories, 0);
    const weekDays = weekSummaries.length;

    weeklyData.push({
      week: i + 1,
      totalCalories: weekCalories,
      averageCalories: weekDays > 0 ? Math.round(weekCalories / weekDays) : 0,
      daysTracked: weekDays,
    });
  }

  return {
    startDate: startOfMonth,
    endDate: endOfMonth,
    dailyCalorieGoal: user?.dailyCalorieGoal || 2000,
    averageCalories: avgCalories,
    totals: monthlyTotals,
    daysTracked,
    weeklyTrends: weeklyData,
  };
};

module.exports = {
  createMeal,
  getMealById,
  getMeals,
  getTodaysMeals,
  updateMeal,
  deleteMeal,
  updateDailySummary,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
};
