const { notificationService } = require('../services/notificationService');

/**
 * Get paginated notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    
    const result = await notificationService.list({
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
};

/**
 * Get notification by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await notificationService.getById(notificationId);

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('❌ Get notification by ID error:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification',
      details: error.message
    });
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await notificationService.markAsRead(notificationId);

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      details: error.message
    });
  }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAllRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead();

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `Marked ${result.modifiedCount} notifications as read`
    });
  } catch (error) {
    console.error('❌ Mark all read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      details: error.message
    });
  }
};

/**
 * Delete notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await notificationService.remove(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      details: error.message
    });
  }
};

/**
 * Delete all notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAll = async (req, res) => {
  try {
    const result = await notificationService.removeAll();

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount
      },
      message: `Deleted ${result.deletedCount} notifications`
    });
  } catch (error) {
    console.error('❌ Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all notifications',
      details: error.message
    });
  }
};

/**
 * Get unread count
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount();

    res.json({
      success: true,
      data: {
        unreadCount: count
      }
    });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      details: error.message
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllRead,
  deleteNotification,
  deleteAll,
  getUnreadCount
};

