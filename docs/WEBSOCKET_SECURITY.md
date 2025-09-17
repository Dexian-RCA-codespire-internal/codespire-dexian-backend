# WebSocket Security Implementation

## Overview
This document outlines the comprehensive security measures implemented for WebSocket connections between the frontend and backend.

## Security Features Implemented

### 1. Authentication
- **JWT Token Validation**: All WebSocket connections require valid SuperTokens JWT tokens
- **Session Verification**: Tokens are verified against SuperTokens session store
- **Token Format**: Supports both `auth.token` and `Authorization: Bearer <token>` formats

### 2. Authorization
- **Role-Based Access Control**: Users have different permission levels
- **Permission Checks**: Each WebSocket operation checks user permissions
- **User Roles**: `admin`, `user`, `viewer` with different access levels

### 3. Rate Limiting
- **Per-User Limits**: Maximum 100 requests per minute per user
- **Connection Limits**: Maximum 3 concurrent connections per user
- **Window-Based**: Sliding window rate limiting

### 4. Encryption (WSS)
- **SSL/TLS Support**: Automatic HTTPS/WSS when certificates are available
- **Certificate Management**: Configurable SSL certificate paths
- **Fallback**: Graceful fallback to HTTP/WS when SSL not available

### 5. Data Protection
- **Authorized Broadcasting**: Data only sent to users with proper permissions
- **Session Tracking**: User sessions tracked and cleaned up on disconnect
- **Error Handling**: Secure error messages without sensitive information

## Configuration

### Environment Variables
```bash
# SSL Configuration
SSL_ENABLED=true
SSL_KEY_PATH=./certs/private-key.pem
SSL_CERT_PATH=./certs/certificate.pem
SSL_CA_PATH=./certs/ca.pem

# CORS Configuration
CORS_ORIGINS=http://localhost:3001,https://yourdomain.com
CORS_CREDENTIALS=true
```

### SSL Certificate Setup
1. Generate SSL certificates:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/private-key.pem -out certs/certificate.pem -days 365 -nodes
```

2. Set environment variables:
```bash
SSL_ENABLED=true
SSL_KEY_PATH=./certs/private-key.pem
SSL_CERT_PATH=./certs/certificate.pem
```

## User Roles and Permissions

### Role Definitions
- **admin**: Full access to all operations
- **user**: Read and write access to tickets
- **viewer**: Read-only access to tickets

### Permission Matrix
| Operation | admin | user | viewer |
|-----------|-------|------|--------|
| read_tickets | ✅ | ✅ | ✅ |
| write_tickets | ✅ | ✅ | ❌ |
| delete_tickets | ✅ | ❌ | ❌ |
| system_admin | ✅ | ❌ | ❌ |

## Frontend Integration

### Secure WebSocket Hook
```javascript
import { useSecureWebSocket } from './hooks/useSecureWebSocket';

const { wsConnected, authError, pollingStatus } = useSecureWebSocket();
```

### Authentication Token
The frontend automatically includes the user's JWT token when connecting:
```javascript
webSocketService.connect(serverUrl, authToken);
```

## Security Monitoring

### Logging
- All authentication attempts are logged
- Rate limit violations are tracked
- Permission denials are recorded
- Connection/disconnection events are monitored

### Error Handling
- Authentication errors are handled gracefully
- Users are notified of permission issues
- Automatic reconnection attempts after auth errors

## Best Practices

### For Developers
1. Always check user permissions before emitting sensitive data
2. Use the secure WebSocket hook in React components
3. Handle authentication errors appropriately
4. Implement proper error boundaries

### For Deployment
1. Use HTTPS/WSS in production
2. Set up proper SSL certificates
3. Configure CORS origins correctly
4. Monitor rate limiting and connection counts
5. Regular security audits

## Security Checklist

- [x] JWT token authentication
- [x] Role-based authorization
- [x] Rate limiting
- [x] Connection limits
- [x] SSL/TLS support
- [x] Secure data broadcasting
- [x] Session management
- [x] Error handling
- [x] Logging and monitoring
- [x] CORS configuration

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check if user is logged in
   - Verify JWT token is valid
   - Check SuperTokens configuration

2. **Permission Denied**
   - Verify user role and permissions
   - Check if user has required access level

3. **Rate Limit Exceeded**
   - Wait for rate limit window to reset
   - Implement client-side request throttling

4. **SSL Certificate Issues**
   - Verify certificate paths are correct
   - Check certificate validity
   - Ensure proper file permissions

## Future Enhancements

- [ ] IP-based rate limiting
- [ ] Advanced session management
- [ ] WebSocket message encryption
- [ ] Audit logging
- [ ] Intrusion detection
- [ ] Automated security testing

