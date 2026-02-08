/**
 * Cloudinary Service
 * Handles image upload and management
 */

const { cloudinary, isConfigured } = require('../config/cloudinary');

/**
 * Upload folder for all food images
 */
const UPLOAD_FOLDER = 'calorie-tracker/meals';

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer - Image data as buffer
 * @param {Object} options - Upload options
 * @param {string} [options.folder] - Folder to upload to
 * @param {string} [options.publicId] - Custom public ID
 * @returns {Promise<Object>} - Upload result with URL and public ID
 */
const uploadImage = async (buffer, options = {}) => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  }

  const folder = options.folder || UPLOAD_FOLDER;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      // Optimize images for mobile
      transformation: [
        { fetch_format: 'auto' },        // webp/avif when possible
      ]

    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    // Create upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
          });
        }
      }
    );

    // Write buffer to stream
    uploadStream.end(buffer);
  });
};

/**
 * Upload an image from a file path
 * @param {string} filePath - Path to the image file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
const uploadFromPath = async (filePath, options = {}) => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  }

  const folder = options.folder || UPLOAD_FOLDER;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { fetch_format: 'auto' },        // webp/avif when possible
      ]

    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/{version}/{publicId}.{format}
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) return null;

    // Get everything after 'upload' and version (if present)
    const relevantParts = parts.slice(uploadIndex + 1);
    
    // Remove version prefix if present (starts with 'v')
    const pathParts = relevantParts.filter(part => !part.match(/^v\d+$/));
    
    // Join and remove file extension
    const publicIdWithExt = pathParts.join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Generate a thumbnail URL from an existing image
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Thumbnail options
 * @param {number} [options.width=200] - Thumbnail width
 * @param {number} [options.height=200] - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
const getThumbnailUrl = (publicId, options = {}) => {
  const width = options.width || 200;
  const height = options.height || 200;

  return cloudinary.url(publicId, {
    transformation: [
      { fetch_format: 'auto' },
    ]

  });
};

module.exports = {
  uploadImage,
  uploadFromPath,
  deleteImage,
  extractPublicIdFromUrl,
  getThumbnailUrl,
};
