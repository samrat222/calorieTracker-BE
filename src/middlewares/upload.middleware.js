/**
 * File Upload Middleware
 * Configures Multer for handling image uploads
 */

const multer = require('multer');
const { errorResponse, HTTP_STATUS } = require('../utils/responses');

/**
 * Allowed MIME types for food images
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Maximum file size (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * File filter function
 * Only allows image files
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      ),
      false
    );
  }
};

/**
 * Multer configuration using memory storage
 * Files are stored in memory as Buffer objects
 */
const storage = multer.memoryStorage();

/**
 * Main upload middleware instance
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only one file at a time
  },
});

/**
 * Middleware for single image upload
 * Field name: 'image'
 */
const singleImageUpload = upload.single('image');

/**
 * Wrapper middleware to handle Multer errors gracefully
 */
const handleUpload = (req, res, next) => {
  singleImageUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return errorResponse(res, {
              statusCode: HTTP_STATUS.BAD_REQUEST.code,
              message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            });
          case 'LIMIT_FILE_COUNT':
            return errorResponse(res, {
              statusCode: HTTP_STATUS.BAD_REQUEST.code,
              message: 'Too many files. Only one file allowed.',
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return errorResponse(res, {
              statusCode: HTTP_STATUS.BAD_REQUEST.code,
              message: 'Unexpected field name. Use "image" as the field name.',
            });
          default:
            return errorResponse(res, {
              statusCode: HTTP_STATUS.BAD_REQUEST.code,
              message: err.message,
            });
        }
      } else if (err) {
        // Handle other errors (like invalid file type)
        return errorResponse(res, {
          statusCode: HTTP_STATUS.BAD_REQUEST.code,
          message: err.message,
        });
      }
    }
    next();
  });
};

/**
 * Middleware that requires an image file
 * Returns error if no file is uploaded
 */
const requireImage = (req, res, next) => {
  if (!req.file) {
    return errorResponse(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST.code,
      message: 'Image file is required',
    });
  }
  next();
};

/**
 * Get file buffer and info from request
 * @param {Object} req - Express request object
 * @returns {Object|null} - File info or null
 */
const getFileInfo = (req) => {
  if (!req.file) {
    return null;
  }

  return {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
    size: req.file.size,
  };
};

module.exports = {
  handleUpload,
  requireImage,
  getFileInfo,
  singleImageUpload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
