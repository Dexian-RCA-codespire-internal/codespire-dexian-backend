# Backend Database Schema Overview

## 🗄️ **Database Collections**

### 1. **Users Collection** (`users`)
```javascript
{
  _id: ObjectId,
  supertokensUserId: String (unique),
  email: String (unique, lowercase),
  name: String,
  firstName: String,
  lastName: String,
  phone: String,
  role: String (enum: ['user', 'admin', 'moderator']),
  isEmailVerified: Boolean,
  emailVerificationOTP: {
    code: String,
    expiresAt: Date
  },
  passwordResetOTP: {
    code: String,
    expiresAt: Date
  },
  otp: String,
  otpExpiry: Date,
  magicLinkToken: String,
  magicLinkExpiry: Date,
  lastLoginAt: Date,
  profilePicture: String,
  preferences: {
    theme: String (enum: ['light', 'dark']),
    notifications: {
      email: Boolean,
      push: Boolean
    }
  },
  status: String (enum: ['active', 'inactive', 'suspended']),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **Tickets Collection** (`tickets`)
```javascript
{
  _id: ObjectId,
  ticket_id: String (unique, indexed),
  source: String (default: "ServiceNow"),
  short_description: String,
  description: String,
  category: String,
  subcategory: String,
  status: String,
  priority: String,
  impact: String,
  urgency: String,
  opened_time: Date,
  closed_time: Date,
  resolved_time: Date,
  requester: {
    id: String
  },
  assigned_to: {
    id: String
  },
  assignment_group: {
    id: String
  },
  company: {
    id: String
  },
  location: {
    id: String
  },
  tags: [String],
  raw: Mixed, // Original ServiceNow payload
  
  // RCA Analysis Fields
  problem_step1: String,
  timeline_step2: String,
  impact_step3: String,
  findings_step4: String,
  root_cause_step5: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 3. **Playbooks Collection** (`playbooks`)
```javascript
{
  _id: ObjectId,
  playbook_id: String (unique, indexed),
  title: String,
  description: String,
  priority: String (enum: ['Low', 'Medium', 'High', 'Critical']),
  tags: [String] (default: ['Custom']),
  usage: String (default: '0 tickets resolved'),
  confidence: String (default: '85%'),
  steps: [{
    step_id: Number,
    title: String,
    action: String,
    expected_outcome: String,
    resources: [String]
  }],
  outcome: String,
  created_by: String,
  is_active: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **RCA Resolved Collection** (`rcaresolved`)
```javascript
{
  _id: ObjectId,
  ticket_id: ObjectId (ref: 'Ticket'),
  ticket_number: String (unique, indexed),
  source: String (default: "ServiceNow"),
  short_description: String,
  description: String,
  category: String,
  priority: String,
  impact: String,
  urgency: String,
  sys_id: String (ServiceNow sys_id, indexed),
  
  // Resolution Data
  root_cause: String,
  close_code: String (enum: ServiceNow close codes),
  customer_summary: String,
  problem_statement: String,
  resolution_analysis: String,
  
  // Resolution Metadata
  resolved_by: String,
  resolved_at: Date,
  resolution_method: String (enum: ['manual', 'automated', 'ai_assisted']),
  
  // ServiceNow Update Status
  servicenow_updated: Boolean,
  servicenow_update_attempts: Number,
  servicenow_last_attempt: Date,
  servicenow_error: String,
  
  // Processing Metadata
  processing_time_ms: Number,
  agent_version: String,
  tags: [String],
  notes: String,
  
  // Raw Data
  raw_ticket_data: Mixed,
  raw_resolution_data: Mixed,
  
  createdAt: Date,
  updatedAt: Date
}
```

## 🔗 **Relationships**

```
Users (1) ──→ (Many) Tickets
Tickets (1) ──→ (1) RCA Resolved
Users (1) ──→ (Many) Playbooks
```

## 📊 **Key Indexes**

### **Users Collection**
- `email` (unique)
- `supertokensUserId` (unique)
- `createdAt` (descending)

### **Tickets Collection**
- `ticket_id + source` (unique compound)
- `status`
- `priority`
- `opened_time`
- `closed_time`

### **Playbooks Collection**
- `playbook_id` (unique)
- `title + description` (text search)
- `priority`
- `tags`
- `is_active`
- `createdAt` (descending)

### **RCA Resolved Collection**
- `ticket_number + source` (unique compound)
- `sys_id`
- `close_code`
- `resolved_at`
- `servicenow_updated`

## 🎯 **Schema Features**

### **Authentication & Users**
- ✅ SuperTokens integration
- ✅ Email verification with OTP
- ✅ Password reset functionality
- ✅ Role-based access control
- ✅ User preferences and settings

### **Ticket Management**
- ✅ ServiceNow integration
- ✅ Comprehensive ticket metadata
- ✅ RCA analysis fields
- ✅ Status tracking
- ✅ Time-based indexing

### **Playbook System**
- ✅ Step-by-step procedures
- ✅ Priority levels
- ✅ Usage tracking
- ✅ Confidence scoring
- ✅ Tag-based categorization

### **Resolution Analysis**
- ✅ Root cause analysis
- ✅ ServiceNow synchronization
- ✅ Resolution tracking
- ✅ Performance metrics
- ✅ Error handling and retry logic

## 🚀 **Advanced Features**

### **Text Search**
- Full-text search on playbook titles and descriptions
- Tag-based filtering
- Priority-based filtering

### **Vector Search** (Qdrant)
- Semantic similarity search for tickets
- AI-powered playbook recommendations
- Intelligent ticket matching

### **Real-time Updates**
- WebSocket integration
- Live status updates
- Notification system

### **Data Validation**
- Required field validation
- Enum value constraints
- Custom validation rules
- Pre-save middleware

## 📈 **Performance Optimizations**

- **Compound Indexes**: Optimized for common query patterns
- **Text Indexes**: Fast full-text search
- **Unique Constraints**: Data integrity
- **Sparse Indexes**: Efficient storage
- **Aggregation Pipelines**: Complex analytics queries

## 🔧 **Maintenance Features**

- **Soft Deletes**: `is_active` flags
- **Audit Trails**: `createdAt`, `updatedAt`
- **Error Tracking**: ServiceNow update attempts
- **Retry Logic**: Failed operation recovery
- **Data Cleanup**: Expired OTP cleanup
