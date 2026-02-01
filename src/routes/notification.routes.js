/**
 * Notification Routes
 * Handles user notification endpoints
 */

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notifications
 * @desc    Create and send a manual notification
 * @access  Private
 */
router.post('/', notificationController.createNotification);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get('/', notificationController.getNotifications);
router.get('/user/:type', notificationController.getNotificationsByType);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', notificationController.markAllAsRead);
router.post('/user/mark-read', notificationController.markMultipleRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
