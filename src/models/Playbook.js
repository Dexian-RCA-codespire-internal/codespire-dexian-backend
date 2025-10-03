// new file servicenow
const mongoose = require('mongoose');

const TriggerSchema = new mongoose.Schema({
  trigger_id: { type: Number, required: true },
  title: { type: String, required: true },
  action: { type: String, required: true },
  expected_outcome: { type: String, required: true },
  resources: { type: [String], default: [] }
}, { _id: false });

const PlaybookSchema = new mongoose.Schema({
  playbook_id: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  priority: { 
    type: String, 
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  tags: { 
    type: [String], 
    default: ['Custom'] 
  },
  usage: { 
    type: String, 
    default: '0 tickets resolved' 
  },
  confidence: { 
    type: String, 
    default: '85%' 
  },
  triggers: { 
    type: [TriggerSchema], 
    required: true,
    validate: {
      validator: function(triggers) {
        return triggers && triggers.length > 0;
      },
      message: 'At least one trigger is required'
    }
  },
  created_by: { 
    type: String, 
    default: null 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true, // adds createdAt and updatedAt
  collection: 'playbooks'
});

// Custom validation to ensure triggers are provided
PlaybookSchema.pre('validate', function(next) {
  if (!this.triggers || this.triggers.length === 0) {
    return next(new Error('At least one trigger is required'));
  }
  next();
});

// Indexes for better query performance
PlaybookSchema.index({ playbook_id: 1 }, { unique: true });
PlaybookSchema.index({ title: 'text', description: 'text' }); // Text search
PlaybookSchema.index({ priority: 1 });
PlaybookSchema.index({ tags: 1 });
PlaybookSchema.index({ is_active: 1 });
PlaybookSchema.index({ created_at: -1 });

// Instance methods
PlaybookSchema.methods.incrementUsage = function() {
  const currentUsage = parseInt(this.usage.match(/\d+/)?.[0] || '0');
  this.usage = `${currentUsage + 1} tickets resolved`;
  return this.save();
};

PlaybookSchema.methods.isHighPriority = function() {
  return ['High', 'Critical'].includes(this.priority);
};

// Static methods
PlaybookSchema.statics.findByPlaybookId = function(playbookId) {
  return this.findOne({ playbook_id: playbookId, is_active: true });
};

PlaybookSchema.statics.findByPriority = function(priority) {
  return this.find({ priority: priority, is_active: true });
};

PlaybookSchema.statics.findByTags = function(tags) {
  return this.find({ 
    tags: { $in: tags }, 
    is_active: true 
  });
};

PlaybookSchema.statics.searchPlaybooks = function(searchTerm) {
  return this.find({
    $and: [
      { is_active: true },
      {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      }
    ]
  });
};

PlaybookSchema.statics.findActivePlaybooks = function() {
  return this.find({ is_active: true }).sort({ createdAt: -1 }).limit(1000);
};

// Pre-save middleware to ensure unique playbook_id
PlaybookSchema.pre('save', async function(next) {
  if (this.isNew && this.playbook_id) {
    const existingPlaybook = await this.constructor.findOne({ 
      playbook_id: this.playbook_id 
    });
    if (existingPlaybook) {
      const error = new Error('Playbook ID already exists');
      error.code = 11000;
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Playbook', PlaybookSchema);

