/**
 * Notification Service
 * Business logic for creating, sending, and managing notifications
 */

const { prisma } = require("../config/database");
const { admin } = require("../config/firebase");

/**
 * Save a notification to the database
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} - Created notification
 */
const saveNotification = async (data) => {
  const { userId, title, body, type } = data;
  
  return prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type: type || 'SYSTEM',
    },
  });
};

/**
 * Send a push notification via FCM
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification content { title, body }
 * @param {Object} [data] - Optional metadata
 * @returns {Promise<boolean>} - Success or failure
 */
const sendPushNotification = async (userId, notification, data = {}) => {
  try {
    // 1. Get user's FCM token from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true }
    });

    if (!user || !user.fcmToken) {
      console.log(`[PUSH INFO] No FCM token for user ${userId}. Skipping push.`);
      return false;
    }

    // Check if Firebase is initialized
    if (admin.apps.length === 0) {
      console.log(`[MOCK PUSH] To User ${userId}: ${notification.title} - ${notification.body}`);
      return true;
    }

    // 2. Build the message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Common for RN/Flutter
      },
      token: user.fcmToken,
    };

    // 3. Send via Firebase
    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

/**
 * Unified method to create and send a notification
 * @param {Object} data - Notification data
 */
const createAndSendNotification = async (data) => {
  const { userId, title, body, type, metadata } = data;

  // 1. Save to DB
  const notification = await saveNotification({ userId, title, body, type });

  // 2. Send Push
  await sendPushNotification(userId, { title, body }, metadata);

  return notification;
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {Object} [options] - Query options
 * @returns {Promise<Array>} - List of notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  const { limit = 20, offset = 0 } = options;

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<Object>} - Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
    },
  });
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Update result
 */
const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Delete result
 */
const deleteNotification = async (notificationId, userId) => {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
};

module.exports = {
  saveNotification,
  sendPushNotification,
  createAndSendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
