# RBAC Collections Structure and Justification

## Overview

This document explains the MongoDB collections used in the RBAC system and justifies why certain data is duplicated between SuperTokens and MongoDB.

## Collection Structure

### 1. **users** Collection (MongoDB)
**Purpose**: Extended user information and local caching
**Schema**:
```javascript
{
  _id: ObjectId,
  supertokensUserId: String, // Links to SuperTokens user
  email: String,
  name: String,
  firstName: String,
  lastName: String,
  phone: String,
  roles: [String], // Cached from SuperTokens
  permissions: [String], // Cached from SuperTokens
  isEmailVerified: Boolean,
  emailVerifiedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **SuperTokens Internal Collections**
**Purpose**: Authentication, session management, and role/permission storage
- `user_roles` - SuperTokens internal role storage
- `user_permissions` - SuperTokens internal permission storage
- `user_sessions` - SuperTokens session management
- `user_metadata` - SuperTokens user metadata

## Justification for Duplicate Storage

### Why Both SuperTokens and MongoDB Store Roles?

#### **SuperTokens (Primary Source)**
- **Authentication Integration**: Roles are tightly integrated with SuperTokens authentication
- **Session Management**: Roles are automatically included in JWT tokens
- **API Security**: SuperTokens middleware can validate roles without database queries
- **Performance**: No database round-trips for role validation
- **Consistency**: Single source of truth for authentication-related data

#### **MongoDB (Cached/Synced)**
- **Extended User Data**: Stores additional user information not in SuperTokens
- **Performance**: Faster queries for user management operations
- **Reporting**: Easy aggregation and analytics on user roles
- **Backup**: Local backup of critical user data
- **Offline Capability**: Can function if SuperTokens is temporarily unavailable

### **Data Flow Architecture**

```
User Registration/Login
         ↓
SuperTokens (Primary)
         ↓
MongoDB Sync (Secondary)
         ↓
Application Logic
```

## Collection Responsibilities

### **SuperTokens Collections**
- ✅ **Authentication**: User login/logout
- ✅ **Session Management**: JWT tokens, refresh tokens
- ✅ **Role Storage**: Primary role storage
- ✅ **Permission Storage**: Primary permission storage
- ✅ **Security**: Built-in security features

### **MongoDB Collections**
- ✅ **User Profiles**: Extended user information
- ✅ **Application Data**: Business logic data
- ✅ **Caching**: Performance optimization
- ✅ **Reporting**: Analytics and reporting
- ✅ **Backup**: Data redundancy

## Synchronization Strategy

### **Automatic Sync Points**
1. **User Registration**: Roles assigned in SuperTokens → Synced to MongoDB
2. **Role Assignment**: SuperTokens role change → MongoDB update
3. **Permission Changes**: SuperTokens permission change → MongoDB update
4. **User Login**: Sync latest roles/permissions from SuperTokens

### **Sync Methods**
```javascript
// Sync roles from SuperTokens to MongoDB
user.syncRolesFromSuperTokens()

// Sync permissions from SuperTokens to MongoDB  
user.syncPermissionsFromSuperTokens()

// Full RBAC sync
user.syncRBACFromSuperTokens()
```

## Best Practices

### **Data Consistency**
- SuperTokens is the **source of truth** for roles/permissions
- MongoDB is a **cached copy** for performance
- Always sync from SuperTokens → MongoDB, never reverse

### **Error Handling**
- If SuperTokens is unavailable, use MongoDB cache
- Log sync failures for manual intervention
- Implement retry mechanisms for failed syncs

### **Performance Optimization**
- Cache frequently accessed role data in MongoDB
- Use MongoDB for complex queries and reporting
- SuperTokens for authentication and authorization

## Migration Strategy

### **From Pure MongoDB to Hybrid**
1. **Phase 1**: Implement SuperTokens authentication
2. **Phase 2**: Migrate roles to SuperTokens
3. **Phase 3**: Implement sync mechanisms
4. **Phase 4**: Remove old MongoDB role storage

### **Rollback Plan**
- Keep MongoDB role data during transition
- Implement feature flags for SuperTokens vs MongoDB
- Maintain backward compatibility

## Monitoring and Maintenance

### **Health Checks**
- SuperTokens connectivity
- MongoDB sync status
- Role consistency between systems
- Permission synchronization

### **Maintenance Tasks**
- Regular sync verification
- Cleanup orphaned data
- Performance monitoring
- Security audits

## Conclusion

The dual storage approach provides:
- **Security**: SuperTokens handles authentication securely
- **Performance**: MongoDB provides fast local queries
- **Reliability**: Redundancy and backup capabilities
- **Flexibility**: Easy to extend with additional user data

This architecture balances security, performance, and maintainability while providing a robust foundation for the RBAC system.
