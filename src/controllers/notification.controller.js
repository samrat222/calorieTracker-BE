/**
 * Notification Controller
 * Handles user notification requests
 */

const notificationService = require('../services/notification.service');
const { successResponse, HTTP_STATUS } = require('../utils/responses');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Create a new notification (Manual trigger)
 * POST /api/notifications
 */
const createNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, body, type, metadata } = req.body;

  const notification = await notificationService.createAndSendNotification({
    userId,
    title,
    body,
    type: type || 'MANUAL',
    metadata
  });

  return successResponse(res, {
    statusCode: HTTP_STATUS.CREATED.code,
    message: 'Notification sent successfully',
    data: { notification },
  });
});

/**
 * Get all notifications for current user
 * GET /api/notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit, offset } = req.query;

  const notifications = await notificationService.getUserNotifications(userId, {
    limit: limit ? parseInt(limit) : 20,
    offset: offset ? parseInt(offset) : 0,
  });

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Notifications retrieved successfully',
    data: { notifications },
  });
});

/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  await notificationService.markAsRead(notificationId, userId);

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Notification marked as read',
  });
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await notificationService.markAllAsRead(userId);

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'All notifications marked as read',
  });
});

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  await notificationService.deleteNotification(notificationId, userId);

  return successResponse(res, {
    statusCode: HTTP_STATUS.OK.code,
    message: 'Notification deleted successfully',
  });
});

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
