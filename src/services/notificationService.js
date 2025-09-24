const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create and broadcast a notification
   * @param {Object} options - Notification options
   * @param {String} options.title - Optional notification title
   * @param {String} options.message - Required notification message
   * @param {String} options.type - Notification type (info/success/warning/error)
   * @param {Object} options.related - Related object with ticketMongoId, ticket_id, eventType
   * @param {String} options.userId - Optional user ID
   * @param {Object} options.metadata - Optional metadata
   * @returns {Object} Created notification document
   */
  async createAndBroadcast({ title, message, type = 'info', related = {}, userId = null, metadata = {} }) {
    try {
      // Create notification in MongoDB
      const notification = new Notification({
        title,
        message,
        type,
        related: {
          ticketMongoId: related.ticketMongoId || null,
          ticket_id: related.ticket_id || null,
          eventType: related.eventType || 'system'
        },
        userId,
        metadata
      });

      const savedNotification = await notification.save();

      // Broadcast notification via WebSocket using existing service (lazy import to avoid circular dependency)
      try {
        const { webSocketService } = require('./websocketService');
        webSocketService.emitNotification(message, type);
      } catch (wsError) {
        console.warn('⚠️ Could not emit WebSocket notification:', wsError.message);
      }

      console.log(`📢 Created and broadcast notification: ${message}`);
      return savedNotification;
    } catch (error) {
      console.error('❌ Failed to create and broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Get paginated list of notifications
   * @param {Object} options - Query options
   * @param {Number} options.page - Page number (default: 1)
   * @param {Number} options.limit - Items per page (default: 10)
   * @param {Boolean} options.unreadOnly - Filter only unread notifications
   * @returns {Object} Paginated notifications result
   */
  async list({ page = 1, limit = 10, unreadOnly = false }) {
    try {
      const skip = (page - 1) * limit;
      const query = unreadOnly ? { isRead: false } : {};

      const notifications = await Notification.find(query)
        .populate('related.ticketMongoId', 'ticket_id short_description status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Notification.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: notifications,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('❌ Failed to list notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {String} notificationId - Notification ID
   * @returns {Object} Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found');
      }

      console.log(`✅ Marked notification as read: ${notificationId}`);
      return notification;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Object} Update result
   */
  async markAllAsRead() {
    try {
      const result = await Notification.updateMany(
        { isRead: false },
        { isRead: true }
      );

      console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
      return result;
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Remove a notification
   * @param {String} notificationId - Notification ID
   * @returns {Object} Deletion result
   */
  async remove(notificationId) {
    try {
      const result = await Notification.findByIdAndDelete(notificationId);

      if (!result) {
        throw new Error('Notification not found');
      }

      console.log(`🗑️ Removed notification: ${notificationId}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to remove notification:', error);
      throw error;
    }
  }

  /**
   * Remove all notifications
   * @returns {Object} Deletion result
   */
  async removeAll() {
    try {
      const result = await Notification.deleteMany({});

      console.log(`🗑️ Removed ${result.deletedCount} notifications`);
      return result;
    } catch (error) {
      console.error('❌ Failed to remove all notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   * @param {String} notificationId - Notification ID
   * @returns {Object} Notification document
   */
  async getById(notificationId) {
    try {
      const notification = await Notification.findById(notificationId)
        .populate('related.ticketMongoId', 'ticket_id short_description status')
        .lean();

      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('❌ Failed to get notification by ID:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   * @returns {Number} Count of unread notifications
   */
  async getUnreadCount() {
    try {
      const count = await Notification.countDocuments({ isRead: false });
      return count;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      throw error;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = {
  NotificationService,
  notificationService
};
