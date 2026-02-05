/**
 * Meal Routes
 * Handles meal CRUD and food image analysis
 */

const express = require('express');
const router = express.Router();

const mealController = require('../controllers/meal.controller');
const { authenticate, requireOnboarding } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { handleUpload } = require('../middlewares/upload.middleware');
const { createMealSchema, updateMealSchema, idParamSchema } = require('../utils/validators');

// All meal routes require authentication and onboarding
router.use(authenticate);
router.use(requireOnboarding);

router.get('/today', mealController.getTodaysMeals);

/**
 * @route   GET /api/meals/previous
 * @desc    Get unique previous meals for the authenticated user
 * @access  Private
 */
router.get('/previous', mealController.getPreviousMeals);

/**
 * @route   POST /api/meals/analyze
 * @desc    Analyze food image with Gemini AI
 * @access  Private
 */
router.post('/analyze', handleUpload, mealController.analyzeFood);

/**
 * @route   POST /api/meals/quick-log
 * @desc    Quick log meal from analysis result
 * @access  Private
 */
router.post('/quick-log', mealController.quickLogMeal);

/**
 * @route   POST /api/meals
 * @desc    Create a new meal entry
 * @access  Private
 */
router.post(
  '/',
  handleUpload,
  validate(createMealSchema),
  mealController.createMeal
);

/**
 * @route   GET /api/meals
 * @desc    Get all meals for the authenticated user (with pagination)
 * @access  Private
 */
router.get('/', mealController.getMeals);

/**
 * @route   GET /api/meals/:id
 * @desc    Get a single meal by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  mealController.getMealById
);

/**
 * @route   PUT /api/meals/:id
 * @desc    Update a meal by ID
 * @access  Private
 */
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  handleUpload,
  validate(updateMealSchema),
  mealController.updateMeal
);

/**
 * @route   DELETE /api/meals/:id
 * @desc    Delete a meal by ID
 * @access  Private
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  mealController.deleteMeal
);

module.exports = router;
