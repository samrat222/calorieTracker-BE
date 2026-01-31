/**
 * Validation Middleware
 * Factory function to validate requests using Zod schemas
 */

const { errorResponse, HTTP_STATUS } = require('../utils/responses');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Create a validation middleware for a given Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @param {string} [source='body'] - Request property to validate ('body', 'query', 'params')
 * @returns {Function} - Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Get the data to validate based on source
      let data;
      switch (source) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = req.params;
          break;
        default:
          data = req.body;
      }

      // Validate using Zod
      const result = schema.safeParse(data);

      if (!result.success) {
        // Format Zod errors
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return errorResponse(res, {
          statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY.code,
          message: 'Validation failed',
          errors,
          code: ERROR_CODES.VALIDATION_ERROR,
        });
      }

      // Replace request data with validated/transformed data
      switch (source) {
        case 'body':
          req.body = result.data;
          break;
        case 'query':
          req.query = result.data;
          break;
        case 'params':
          req.params = result.data;
          break;
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      return errorResponse(res, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR.code,
        message: 'Validation error',
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
  };
};

/**
 * Validate multiple sources at once
 * @param {Object} schemas - Object with 'body', 'query', 'params' keys
 * @returns {Function} - Express middleware
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const allErrors = [];

    // Validate each source if schema provided
    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          source,
          field: err.path.join('.'),
          message: err.message,
        }));
        allErrors.push(...errors);
      } else {
        req[source] = result.data;
      }
    }

    if (allErrors.length > 0) {
      return errorResponse(res, {
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY.code,
        message: 'Validation failed',
        errors: allErrors,
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    }

    next();
  };
};

module.exports = {
  validate,
  validateMultiple,
};
