const express = require('express');
const router = express.Router();
const { doc, schemas } = require('../utils/apiDoc');

// Import controller
const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllRead,
  deleteNotification,
  deleteAll,
  getUnreadCount
} = require('../controllers/notificationsController');

// Import middleware (if auth is needed)
// const auth = require('../middleware/auth');

// Get paginated notifications
router.get('/', 
  doc.getList('/notifications', 'Get paginated notifications', ['Notifications']),
  getNotifications
);

// Get unread notifications count
router.get('/unread-count', 
  doc.get('/notifications/unread-count', 'Get unread notifications count', ['Notifications']),
  getUnreadCount
);

// Get notification by ID
router.get('/:notificationId', 
  doc.getById('/notifications/{notificationId}', 'Get notification by ID', ['Notifications']),
  getNotificationById
);

// Mark notification as read
router.patch('/:notificationId/read', 
  doc.patch('/notifications/{notificationId}/read', 'Mark notification as read', ['Notifications']),
  markAsRead
);

// Mark all notifications as read
router.patch('/mark-all-read', 
  doc.patch('/notifications/mark-all-read', 'Mark all notifications as read', ['Notifications']),
  markAllRead
);

// Delete notification
router.delete('/:notificationId', 
  doc.delete('/notifications/{notificationId}', 'Delete notification', ['Notifications']),
  deleteNotification
);

// Delete all notifications
router.delete('/delete-all', 
  doc.delete('/notifications/delete-all', 'Delete all notifications', ['Notifications']),
  deleteAll
);

module.exports = router;

