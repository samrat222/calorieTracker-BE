/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const { verifyToken, extractTokenFromHeader } = require('../services/auth.service');
const { prisma } = require('../config/database');
const { errorResponse, HTTP_STATUS } = require('../utils/responses');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Middleware to authenticate requests using JWT
 * Attaches user object to request if successful
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return errorResponse(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED.code,
        message: 'Access denied. No token provided.',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(res, {
          statusCode: HTTP_STATUS.UNAUTHORIZED.code,
          message: 'Token has expired. Please login again.',
          code: ERROR_CODES.AUTHENTICATION_ERROR,
        });
      }
      return errorResponse(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED.code,
        message: 'Invalid token.',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isOnboarded: true,
        age: true,
        weight: true,
        height: true,
        gender: true,
        activityLevel: true,
        bmi: true,
        dailyCalorieGoal: true,
      },
    });

    if (!user) {
      return errorResponse(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED.code,
        message: 'User not found.',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR.code,
      message: 'Authentication failed.',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }
};

/**
 * Middleware to check if user has completed onboarding
 * Should be used after authenticate middleware
 */
const requireOnboarding = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED.code,
      message: 'User not authenticated.',
      code: ERROR_CODES.AUTHENTICATION_ERROR,
    });
  }

  if (!req.user.isOnboarded) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.FORBIDDEN.code,
      message: 'Please complete onboarding first.',
      code: ERROR_CODES.AUTHORIZATION_ERROR,
    });
  }

  next();
};

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          isOnboarded: true,
        },
      });

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but optional so continue
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  requireOnboarding,
  optionalAuth,
};
