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

  // Map fields for FE compatibility
  const mappedNotifications = notifications.map(n => ({
    notificationId: n.id,
    templateName: n.title,
    templateBody: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt,
    type: n.type
  }));

  // Support FE expected structure
  const responseData = {
    list: mappedNotifications,
    total: mappedNotifications.length,
  };

  return res.status(HTTP_STATUS.OK.code).json({
    result: {
      responseCode: 200,
      message: 'Notifications retrieved successfully'
    },
    data: responseData
  });
});

/**
 * Get unread/archive notifications (FE Compatibility)
 * GET /api/notifications/user/unread
 * GET /api/notifications/user/archive
 */
const getNotificationsByType = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { type } = req.params;
  const { pageNo, pageSize } = req.query;

  const limit = pageSize ? parseInt(pageSize) : 10;
  const offset = pageNo ? parseInt(pageNo) * limit : 0;

  // If type is unread, filter. If archive, show all.
  let notifications;
  if (type === 'unread') {
    notifications = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  } else {
    notifications = await notificationService.getUserNotifications(userId, { limit, offset });
  }

  // Map fields for FE compatibility
  const mappedNotifications = notifications.map(n => ({
    notificationId: n.id,
    templateName: n.title,
    templateBody: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt,
    type: n.type
  }));

  const responseData = {
    list: mappedNotifications,
    total: mappedNotifications.length,
  };

  return res.status(HTTP_STATUS.OK.code).json({
    result: {
      responseCode: 200,
      message: `${type} notifications retrieved successfully`
    },
    data: responseData
  });
});

/**
 * Mark multiple notifications as read (FE Compatibility)
 * POST /api/notifications/user/mark-read
 */
const markMultipleRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notificationIds = req.body; // Expecting array of IDs

  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { isRead: true },
    });
  } else if (Array.isArray(notificationIds) && notificationIds.length === 0) {
    // If empty array, mark ALL as read (current FE behavior for Mark All)
    await notificationService.markAllAsRead(userId);
  }

  return res.status(HTTP_STATUS.OK.code).json({
    result: {
      responseCode: 200,
      message: 'Notifications marked as read'
    },
    data: {}
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
  getNotificationsByType,
  markAsRead,
  markMultipleRead,
  markAllAsRead,
  deleteNotification,
};
