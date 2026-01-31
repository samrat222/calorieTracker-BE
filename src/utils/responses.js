/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.message='Success'] - Success message
 * @param {*} [options.data=null] - Response data
 * @param {Object} [options.meta=null] - Additional metadata (pagination, etc.)
 */
const successResponse = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {number} [options.statusCode=500] - HTTP status code
 * @param {string} [options.message='Internal Server Error'] - Error message
 * @param {Array} [options.errors=null] - Array of detailed errors (for validation)
 * @param {string} [options.code=null] - Error code for client handling
 */
const errorResponse = (res, { statusCode = 500, message = 'Internal Server Error', errors = null, code = null }) => {
  const response = {
    success: false,
    message,
  };

  if (code) {
    response.code = code;
  }

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {Array} options.data - Array of items
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Items per page
 * @param {number} options.total - Total number of items
 * @param {string} [options.message='Success'] - Success message
 */
const paginatedResponse = (res, { data, page, limit, total, message = 'Success' }) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    },
  });
};

/**
 * Common HTTP status codes with messages
 */
const HTTP_STATUS = {
  OK: { code: 200, message: 'OK' },
  CREATED: { code: 201, message: 'Created' },
  NO_CONTENT: { code: 204, message: 'No Content' },
  BAD_REQUEST: { code: 400, message: 'Bad Request' },
  UNAUTHORIZED: { code: 401, message: 'Unauthorized' },
  FORBIDDEN: { code: 403, message: 'Forbidden' },
  NOT_FOUND: { code: 404, message: 'Not Found' },
  CONFLICT: { code: 409, message: 'Conflict' },
  UNPROCESSABLE_ENTITY: { code: 422, message: 'Validation Error' },
  TOO_MANY_REQUESTS: { code: 429, message: 'Too Many Requests' },
  INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal Server Error' },
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  HTTP_STATUS,
};
