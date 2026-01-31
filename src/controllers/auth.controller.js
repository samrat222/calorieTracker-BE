/**
 * Authentication Controller
 * Handles user registration and login
 */

const { prisma } = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../services/auth.service');
const { successResponse, errorResponse, HTTP_STATUS } = require('../utils/responses');
const { ERROR_CODES } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.CONFLICT.code,
      message: 'User with this email already exists',
      code: ERROR_CODES.DUPLICATE_ENTRY,
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isOnboarded: true,
      createdAt: true,
    },
  });

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  return successResponse(res, {
    statusCode: HTTP_STATUS.CREATED.code,
    message: 'User registered successfully',
    data: {
      user,
      token,
    },
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED.code,
      message: 'Invalid email or password',
      code: ERROR_CODES.AUTHENTICATION_ERROR,
    });
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED.code,
      message: 'Invalid email or password',
      code: ERROR_CODES.AUTHENTICATION_ERROR,
    });
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  // Return user data (excluding password)
  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    isOnboarded: user.isOnboarded,
    age: user.age,
    weight: user.weight,
    height: user.height,
    gender: user.gender,
    activityLevel: user.activityLevel,
    bmi: user.bmi,
    dailyCalorieGoal: user.dailyCalorieGoal,
  };

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Login successful',
    data: {
      user: userData,
      token,
    },
  });
});

/**
 * Logout user (optional - client-side token removal)
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  // For JWT, logout is typically handled client-side by removing the token
  // This endpoint can be used for logging, token blacklisting, etc.
  
  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Logged out successfully',
  });
});

/**
 * Get current user (for token validation)
 * GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'User retrieved successfully',
    data: { user },
  });
});

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};
