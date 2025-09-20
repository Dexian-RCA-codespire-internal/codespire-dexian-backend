const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    optional: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error'], 
    default: 'info' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  related: {
    ticketMongoId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Ticket', 
      default: null 
    },
    ticket_id: { 
      type: String, 
      default: null 
    },
    eventType: { 
      type: String, 
      enum: ['new_ticket', 'updated_ticket', 'status_changed', 'system'], 
      default: 'system' 
    }
  },
  userId: { 
    type: String, 
    default: null 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed 
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Indexes for performance
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);

