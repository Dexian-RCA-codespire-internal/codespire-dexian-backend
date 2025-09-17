/**
 * RCAResolved Model
 * Stores resolved tickets with root cause analysis data
 */

const mongoose = require('mongoose');
const { servicenow } = require('../constants');

const RCAResolvedSchema = new mongoose.Schema({
    // Ticket identification
    ticket_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Ticket' },
    ticket_number: { type: String, required: true, index: true }, // e.g., "INC0010041"
    source: { type: String, required: true }, // "ServiceNow"
    
    // Ticket details
    short_description: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    priority: { type: String },
    impact: { type: String },
    urgency: { type: String },
    
    // ServiceNow specific data
    sys_id: { type: String, required: true, index: true }, // ServiceNow sys_id
    
    // Resolution data
    root_cause: { type: String, required: true },
    close_code: { 
        type: String, 
        required: true,
        enum: servicenow.CLOSE_CODE_LIST,
        validate: {
            validator: function(v) {
                return servicenow.isValidCloseCode(v);
            },
            message: 'Invalid close code. Valid codes are: ' + servicenow.CLOSE_CODE_LIST.join(', ')
        }
    },
    customer_summary: { type: String, required: true },
    problem_statement: { type: String },
    resolution_analysis: { type: String },
    
    // Resolution metadata
    resolved_by: { type: String }, // User who resolved the ticket
    resolved_at: { type: Date, default: Date.now },
    resolution_method: { type: String, enum: ['manual', 'automated', 'ai_assisted'], default: 'ai_assisted' },
    
    // ServiceNow update status
    servicenow_updated: { type: Boolean, default: false },
    servicenow_update_attempts: { type: Number, default: 0 },
    servicenow_last_attempt: { type: Date },
    servicenow_error: { type: String },
    
    // Processing metadata
    processing_time_ms: { type: Number },
    agent_version: { type: String, default: '1.0.0' },
    
    // Additional metadata
    tags: { type: [String], default: [] },
    notes: { type: String },
    
    // Raw data for reference
    raw_ticket_data: { type: mongoose.Schema.Types.Mixed },
    raw_resolution_data: { type: mongoose.Schema.Types.Mixed }
}, {
    timestamps: true, // adds createdAt and updatedAt
    collection: 'rcaresolved'
});

// Indexes for better query performance
RCAResolvedSchema.index({ ticket_number: 1, source: 1 }, { unique: true });
RCAResolvedSchema.index({ sys_id: 1 });
RCAResolvedSchema.index({ close_code: 1 });
RCAResolvedSchema.index({ resolved_at: 1 });
RCAResolvedSchema.index({ servicenow_updated: 1 });
RCAResolvedSchema.index({ category: 1 });
RCAResolvedSchema.index({ priority: 1 });

// Compound indexes for common queries
RCAResolvedSchema.index({ source: 1, resolved_at: -1 });
RCAResolvedSchema.index({ close_code: 1, resolved_at: -1 });
RCAResolvedSchema.index({ servicenow_updated: 1, servicenow_update_attempts: 1 });

// Instance methods
RCAResolvedSchema.methods.isServiceNowUpdated = function() {
    return this.servicenow_updated === true;
};

RCAResolvedSchema.methods.needsServiceNowUpdate = function() {
    return !this.servicenow_updated && this.servicenow_update_attempts < 3;
};

RCAResolvedSchema.methods.canRetryServiceNowUpdate = function() {
    if (this.servicenow_updated) return false;
    if (this.servicenow_update_attempts >= 3) return false;
    
    // Allow retry after 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return !this.servicenow_last_attempt || this.servicenow_last_attempt < oneHourAgo;
};

RCAResolvedSchema.methods.markServiceNowUpdateAttempt = function(success = false, error = null) {
    this.servicenow_update_attempts += 1;
    this.servicenow_last_attempt = new Date();
    
    if (success) {
        this.servicenow_updated = true;
        this.servicenow_error = null;
    } else {
        this.servicenow_error = error;
    }
    
    return this.save();
};

// Static methods
RCAResolvedSchema.statics.findByTicketNumber = function(ticketNumber, source = 'ServiceNow') {
    return this.findOne({ ticket_number: ticketNumber, source: source });
};

RCAResolvedSchema.statics.findBySysId = function(sysId) {
    return this.findOne({ sys_id: sysId });
};

RCAResolvedSchema.statics.findPendingServiceNowUpdates = function() {
    return this.find({
        servicenow_updated: false,
        servicenow_update_attempts: { $lt: 3 }
    });
};

RCAResolvedSchema.statics.findByCloseCode = function(closeCode) {
    return this.find({ close_code: closeCode });
};

RCAResolvedSchema.statics.getResolutionStats = function(startDate, endDate) {
    const matchStage = {};
    
    if (startDate || endDate) {
        matchStage.resolved_at = {};
        if (startDate) matchStage.resolved_at.$gte = startDate;
        if (endDate) matchStage.resolved_at.$lte = endDate;
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$close_code',
                count: { $sum: 1 },
                avgProcessingTime: { $avg: '$processing_time_ms' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

RCAResolvedSchema.statics.getResolutionTrends = function(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.aggregate([
        { $match: { resolved_at: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$resolved_at' } },
                    closeCode: '$close_code'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.date': 1, '_id.closeCode': 1 } }
    ]);
};

// Pre-save middleware
RCAResolvedSchema.pre('save', function(next) {
    // Ensure required fields are present
    if (!this.ticket_number && this.raw_ticket_data?.number) {
        this.ticket_number = this.raw_ticket_data.number;
    }
    
    if (!this.sys_id && this.raw_ticket_data?.sys_id) {
        this.sys_id = this.raw_ticket_data.sys_id;
    }
    
    next();
});

// Post-save middleware
RCAResolvedSchema.post('save', function(doc) {
    console.log(`📝 RCA Resolution saved: ${doc.ticket_number} - ${doc.close_code}`);
});

module.exports = mongoose.model('RCAResolved', RCAResolvedSchema);
