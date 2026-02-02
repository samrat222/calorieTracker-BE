/**
 * Zod Validation Schemas
 * Centralized validation schemas for all API endpoints
 */

const { z } = require('zod');
const { MEAL_TYPES, GENDERS, ACTIVITY_LEVELS } = require('./constants');

// ============================================
// Auth Schemas
// ============================================

const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// User/Onboarding Schemas
// ============================================

const onboardingSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Invalid age'),
  weight: z
    .number()
    .positive('Weight must be positive')
    .min(20, 'Weight must be at least 20 kg')
    .max(500, 'Weight must be less than 500 kg'),
  height: z
    .number()
    .positive('Height must be positive')
    .min(50, 'Height must be at least 50 cm')
    .max(300, 'Height must be less than 300 cm'),
  gender: z.enum(GENDERS, {
    errorMap: () => ({ message: 'Gender must be either male or female' }),
  }),
  activityLevel: z
    .number()
    .refine(
      (val) => Object.values(ACTIVITY_LEVELS).includes(val),
      'Invalid activity level. Must be one of: 1.2, 1.375, 1.55, 1.725, 1.9'
    ),
  goal: z.enum(['lose', 'gain', 'maintain'], {
    errorMap: () => ({ message: 'Goal must be either lose, gain or maintain' }),
  }),
});

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Invalid age')
    .optional(),
  weight: z
    .number()
    .positive('Weight must be positive')
    .min(20, 'Weight must be at least 20 kg')
    .max(500, 'Weight must be less than 500 kg')
    .optional(),
  height: z
    .number()
    .positive('Height must be positive')
    .min(50, 'Height must be at least 50 cm')
    .max(300, 'Height must be less than 300 cm')
    .optional(),
  gender: z
    .enum(GENDERS, {
      errorMap: () => ({ message: 'Gender must be either male or female' }),
    })
    .optional(),
  activityLevel: z
    .number()
    .refine(
      (val) => Object.values(ACTIVITY_LEVELS).includes(val),
      'Invalid activity level'
    )
    .optional(),
  goal: z.enum(['lose', 'gain', 'maintain'], {
    errorMap: () => ({ message: 'Goal must be either lose, gain or maintain' }),
  }).optional(),
});

// ============================================
// Meal Schemas
// ============================================

const createMealSchema = z.object({
  mealType: z.enum(MEAL_TYPES, {
    errorMap: () => ({
      message: 'Meal type must be one of: breakfast, lunch, dinner, snack',
    }),
  }),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  totalCalories: z.coerce.number().int().min(0, 'Calories must be non-negative'),
  protein: z.coerce.number().min(0, 'Protein must be non-negative').optional(),
  carbs: z.coerce.number().min(0, 'Carbs must be non-negative').optional(),
  fats: z.coerce.number().min(0, 'Fats must be non-negative').optional(),
  fiber: z.coerce.number().min(0, 'Fiber must be non-negative').optional(),
  mealDate: z.coerce.date().optional(),
  foodItems: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  }, z
    .array(
      z.object({
        foodName: z.string().min(1, 'Food name is required').max(200),
        quantity: z.coerce.number().positive('Quantity must be positive'),
        unit: z.string().min(1, 'Unit is required').max(50),
        calories: z.coerce.number().int().min(0),
        protein: z.coerce.number().min(0).optional(),
        carbs: z.coerce.number().min(0).optional(),
        fats: z.coerce.number().min(0).optional(),
      })
    )
    .optional()),
});

const updateMealSchema = z.object({
  mealType: z
    .enum(MEAL_TYPES, {
      errorMap: () => ({
        message: 'Meal type must be one of: breakfast, lunch, dinner, snack',
      }),
    })
    .optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  totalCalories: z.coerce.number().int().min(0, 'Calories must be non-negative').optional(),
  protein: z.coerce.number().min(0, 'Protein must be non-negative').optional(),
  carbs: z.coerce.number().min(0, 'Carbs must be non-negative').optional(),
  fats: z.coerce.number().min(0, 'Fats must be non-negative').optional(),
  fiber: z.coerce.number().min(0, 'Fiber must be non-negative').optional(),
  mealDate: z.coerce.date().optional(),
  foodItems: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  }, z
    .array(
      z.object({
        id: z.string().uuid().optional(), // For updating existing items
        foodName: z.string().min(1, 'Food name is required').max(200),
        quantity: z.coerce.number().positive('Quantity must be positive'),
        unit: z.string().min(1, 'Unit is required').max(50),
        calories: z.coerce.number().int().min(0),
        protein: z.coerce.number().min(0).optional(),
        carbs: z.coerce.number().min(0).optional(),
        fats: z.coerce.number().min(0).optional(),
      })
    )
    .optional()),
});

// ============================================
// Query Params Schemas
// ============================================

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// ID Param Schema
// ============================================

const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

module.exports = {
  registerSchema,
  loginSchema,
  onboardingSchema,
  updateProfileSchema,
  createMealSchema,
  updateMealSchema,
  paginationSchema,
  dateRangeSchema,
  idParamSchema,
};
