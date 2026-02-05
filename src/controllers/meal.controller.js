/**
 * Meal Controller
 * Handles meal CRUD operations and image analysis
 */

const mealService = require("../services/meal.service");
const geminiService = require("../services/gemini.service");
const cloudinaryService = require("../services/cloudinary.service");
const { getFileInfo } = require("../middlewares/upload.middleware");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  HTTP_STATUS,
} = require("../utils/responses");
const { ERROR_CODES } = require("../utils/constants");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * Create a new meal
 * POST /api/meals
 */
const createMeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    mealType,
    description,
    totalCalories,
    protein,
    carbs,
    fats,
    fiber,
    mealDate,
    foodItems,
  } = req.body;

  // Handle image upload if present
  let imageUrl = null;
  const fileInfo = getFileInfo(req);

  if (fileInfo) {
    try {
      const uploadResult = await cloudinaryService.uploadImage(fileInfo.buffer);
      imageUrl = uploadResult.url;
    } catch (error) {
      console.error("Image upload failed:", error);
      // Continue without image - not a critical failure
    }
  }

  // Create meal
  const meal = await mealService.createMeal({
    userId,
    mealType,
    description,
    imageUrl,
    totalCalories,
    protein,
    carbs,
    fats,
    fiber,
    mealDate: mealDate ? new Date(mealDate) : new Date(),
    foodItems,
  });

  return successResponse(res, {
    statusCode: HTTP_STATUS.CREATED.code,
    message: "Meal created successfully",
    data: { meal },
  });
});

/**
 * Get all meals for the logged-in user
 * GET /api/meals
 */
const getMeals = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, startDate, endDate, mealType } = req.query;

  const result = await mealService.getMeals(userId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    startDate,
    endDate,
    mealType,
  });

  return paginatedResponse(res, {
    data: result.meals,
    page: result.page,
    limit: result.limit,
    total: result.total,
    message: "Meals retrieved successfully",
  });
});

/**
 * Get a single meal by ID
 * GET /api/meals/:id
 */
const getMealById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const meal = await mealService.getMealById(id, userId);

  if (!meal) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.NOT_FOUND.code,
      message: "Meal not found",
      code: ERROR_CODES.NOT_FOUND,
    });
  }

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Meal retrieved successfully",
    data: { meal },
  });
});

/**
 * Get today's meals
 * GET /api/meals/today
 */
const getTodaysMeals = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await mealService.getTodaysMeals(userId);

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Today's meals retrieved successfully",
    data: result,
  });
});

/**
 * Update a meal
 * PUT /api/meals/:id
 */
const updateMeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const updateData = req.body;

  // Handle image upload if present
  const fileInfo = getFileInfo(req);
  if (fileInfo) {
    try {
      const uploadResult = await cloudinaryService.uploadImage(fileInfo.buffer);
      updateData.imageUrl = uploadResult.url;
    } catch (error) {
      console.error("Image upload failed:", error);
    }
  }

  const meal = await mealService.updateMeal(id, userId, updateData);

  if (!meal) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.NOT_FOUND.code,
      message: "Meal not found or you do not have permission to update it",
      code: ERROR_CODES.NOT_FOUND,
    });
  }

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Meal updated successfully",
    data: { meal },
  });
});

/**
 * Delete a meal
 * DELETE /api/meals/:id
 */
const deleteMeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  // Get meal first to get image URL for deletion
  const existingMeal = await mealService.getMealById(id, userId);

  if (!existingMeal) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.NOT_FOUND.code,
      message: "Meal not found or you do not have permission to delete it",
      code: ERROR_CODES.NOT_FOUND,
    });
  }

  // Delete from database
  await mealService.deleteMeal(id, userId);

  // Try to delete image from Cloudinary (non-blocking)
  if (existingMeal.imageUrl) {
    const publicId = cloudinaryService.extractPublicIdFromUrl(
      existingMeal.imageUrl,
    );
    if (publicId) {
      cloudinaryService.deleteImage(publicId).catch((err) => {
        console.error("Failed to delete image from Cloudinary:", err);
      });
    }
  }

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Meal deleted successfully",
  });
});

/**
 * Analyze food image with Gemini
 * POST /api/meals/analyze
 */
const analyzeFood = asyncHandler(async (req, res) => {
  const fileInfo = getFileInfo(req);
  const { description } = req.body;

  if (!fileInfo && !description) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST.code,
      message: "Either an image or text description is required",
    });
  }

  let analysisResult;
  let imageUrl = null;

  try {
    if (fileInfo) {
      // 1️⃣ Analyze FIRST using buffer
      analysisResult = await geminiService.analyzeImage(
        fileInfo.buffer,
        fileInfo.mimetype
      );

      // 2️⃣ Then upload image to Cloudinary
      const uploadResult = await cloudinaryService.uploadImage(
        fileInfo.buffer
      );
      imageUrl = uploadResult.url;

    } else {
      // Analyze text
      analysisResult = await geminiService.analyzeTextDescription(description);
    }

  } catch (error) {
    console.error("Food analysis error:", error);

    // Detect Rate Limit/Quota Exceeded
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
      return errorResponse(res, {
        statusCode: 429,
        message: "Gemini API daily limit reached. Please log manually or try tomorrow.",
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      });
    }

    return errorResponse(res, {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR.code,
      message: "Failed to analyze food. Please try again.",
      code: ERROR_CODES.GEMINI_API_ERROR,
    });
  }

  if (!analysisResult.success) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST.code,
      message: analysisResult.error || "Could not analyze the food",
    });
  }

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Food analyzed successfully",
    data: {
      ...analysisResult,
      imageUrl,
    },
  });
});


/**
 * Quick log meal from analysis result
 * POST /api/meals/quick-log
 */
const quickLogMeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { mealType, imageUrl, analysisResult } = req.body;

  if (
    !analysisResult ||
    !analysisResult.foodItems ||
    !analysisResult.totalNutrition
  ) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST.code,
      message: "Invalid analysis result. Please analyze food first.",
    });
  }

  const { foodItems, totalNutrition, mealDescription } = analysisResult;

  // Create meal from analysis
  const meal = await mealService.createMeal({
    userId,
    mealType,
    description: mealDescription || "Quick logged meal",
    imageUrl,
    totalCalories: totalNutrition.calories || 0,
    protein: totalNutrition.protein,
    carbs: totalNutrition.carbs,
    fats: totalNutrition.fats,
    fiber: totalNutrition.fiber,
    mealDate: new Date(),
    foodItems: foodItems.map((item) => ({
      foodName: item.foodName,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
    })),
  });

  return successResponse(res, {
    statusCode: HTTP_STATUS.CREATED.code,
    message: "Meal logged successfully",
    data: { meal },
  });
});

/**
 * Get unique previous meals for the logged-in user
 * GET /api/meals/previous
 */
const getPreviousMeals = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit } = req.query;

  const meals = await mealService.getPreviousMeals(userId, parseInt(limit) || 50);

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: "Previous meals retrieved successfully",
    data: { meals },
  });
});

module.exports = {
  createMeal,
  getMeals,
  getMealById,
  getTodaysMeals,
  updateMeal,
  deleteMeal,
  analyzeFood,
  quickLogMeal,
  getPreviousMeals,
};
