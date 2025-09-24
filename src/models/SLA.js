/**
 * SLA Model
 * Stores SLA tracking information for tickets
 */

const mongoose = require('mongoose');

const SLASchema = new mongoose.Schema({
  ticket_id: { 
    type: String, 
    required: true, 
    index: true 
  },
  source: { 
    type: String, 
    required: true,
    default: 'ServiceNow'
  },
  category: { 
    type: String 
  },
  status: { 
    type: String 
  },
  priority: { 
    type: String,
    enum: ['P1', 'P2', 'P3'],
    required: true
  },
  assigned_to: {
    id: { type: String }
  },
  opened_time: { 
    type: Date,
    required: true
  },
  // Reference to the original ticket
  ticket_mongo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true
  },
  // Track last notification status to prevent duplicates
  last_notification_status: {
    type: String,
    enum: ['safe', 'warning', 'critical', 'breached', null],
    default: null
  },
  // Timestamp when last notification was sent
  last_notification_time: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // adds createdAt and updatedAt
  collection: 'sla'
});

// Compound index for uniqueness
SLASchema.index({ ticket_id: 1, source: 1 }, { unique: true });

// Additional indexes for better query performance
SLASchema.index({ priority: 1 });
SLASchema.index({ status: 1 });
SLASchema.index({ opened_time: 1 });
SLASchema.index({ 'assigned_to.id': 1 });

// Instance methods
SLASchema.methods.isHighPriority = function() {
  return this.priority === 'P1';
};

SLASchema.methods.isCritical = function() {
  return this.priority === 'P1';
};

// Static methods
SLASchema.statics.findByTicketId = function(ticketId, source = 'ServiceNow') {
  return this.findOne({ ticket_id: ticketId, source: source });
};

SLASchema.statics.findByPriority = function(priority) {
  return this.find({ priority: priority });
};

SLASchema.statics.findCriticalSLAs = function() {
  return this.find({ priority: 'P1' });
};

SLASchema.statics.findByAssignee = function(assigneeId) {
  return this.find({ 'assigned_to.id': assigneeId });
};

module.exports = mongoose.model('SLA', SLASchema);