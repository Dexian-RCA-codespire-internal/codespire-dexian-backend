// new file servicenow
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticket_id:        { type: String, required: true, index: true },         // unique ticket number
  source:           { type: String, required: true },                      // "ServiceNow"
  short_description:{ type: String, required: true },
  description:      { type: String },
  category:         { type: String },
  subcategory:      { type: String },
  status:           { type: String },                                      // e.g. "Closed"
  priority:         { type: String },
  impact:           { type: String },
  urgency:          { type: String },
  opened_time:      { type: Date },                                        // ISO 8601 or Date
  closed_time:      { type: Date },
  resolved_time:    { type: Date },
  requester: {
    id:             { type: String }
  },
  assigned_to: {
    id:             { type: String }
  },
  assignment_group: {
    id:             { type: String }
  },
  company: {
    id:             { type: String }
  },
  location: {
    id:             { type: String, default: null }
  },
  tags:             { type: [String], default: [] },
  raw:              { type: mongoose.Schema.Types.Mixed }                  // store the entire original payload (optional)
}, {
  timestamps: true, // adds createdAt and updatedAt
  collection: 'tickets'
});

// Indexes for better query performance
TicketSchema.index({ ticket_id: 1, source: 1 }, { unique: true });
TicketSchema.index({ status: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ opened_time: 1 });
TicketSchema.index({ closed_time: 1 });

// Instance methods
TicketSchema.methods.isOpen = function() {
  return this.status && !['Closed', 'Resolved', 'Cancelled'].includes(this.status);
};

TicketSchema.methods.isClosed = function() {
  return this.status && ['Closed', 'Resolved', 'Cancelled'].includes(this.status);
};

// Static methods
TicketSchema.statics.findByTicketId = function(ticketId, source = 'ServiceNow') {
  return this.findOne({ ticket_id: ticketId, source: source });
};

TicketSchema.statics.findOpenTickets = function() {
  return this.find({ 
    status: { $nin: ['Closed', 'Resolved', 'Cancelled'] } 
  });
};

TicketSchema.statics.findClosedTickets = function() {
  return this.find({ 
    status: { $in: ['Closed', 'Resolved', 'Cancelled'] } 
  });
};

TicketSchema.statics.findBySource = function(source) {
  return this.find({ source: source });
};

module.exports = mongoose.model('Ticket', TicketSchema);
