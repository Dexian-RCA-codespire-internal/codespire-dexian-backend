# Email Verification Flow with OTP

This document explains the complete email verification flow implemented in the test-bg project using SuperTokens, MongoDB, and SMTP.

## Overview

The authentication system now includes:
- User registration with automatic OTP generation
- Email verification using OTP sent via SMTP
- Database storage of user data with verification status
- Login restriction until email is verified
- Welcome email after successful verification

## Flow Diagram

```
1. User Registration
   ↓
2. SuperTokens User Creation
   ↓
3. MongoDB User Record Creation
   ↓
4. OTP Generation & Storage
   ↓
5. OTP Email Sent via SMTP
   ↓
6. User Enters OTP
   ↓
7. OTP Verification
   ↓
8. Email Marked as Verified
   ↓
9. Welcome Email Sent
   ↓
10. User Can Login
```

## API Endpoints

### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email for verification code.",
  "user": {
    "id": "supertokens-user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": false
  },
  "emailSent": true
}
```

### 2. Send OTP (Resend)
```http
POST /api/v1/auth/send-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email address"
}
```

### 3. Verify OTP
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully! You can now log in to your account.",
  "user": {
    "id": "supertokens-user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": true
  }
}
```

### 4. Check Verification Status
```http
POST /api/v1/auth/check-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "email": "user@example.com",
  "isEmailVerified": true,
  "status": "active"
}
```

### 5. Login (Only after verification)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (if not verified):**
```json
{
  "error": "Email not verified",
  "message": "Please verify your email address before logging in",
  "requiresVerification": true
}
```

**Response (if verified):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "supertokens-user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": true,
    "role": "user",
    "lastLoginAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Database Schema

### User Model (MongoDB)
```javascript
{
  supertokensUserId: String, // Required, unique
  email: String, // Required, unique, lowercase
  name: String, // Required
  role: String, // Enum: ['user', 'admin', 'moderator'], default: 'user'
  isEmailVerified: Boolean, // Default: false
  emailVerificationOTP: {
    code: String,
    expiresAt: Date
  },
  lastLoginAt: Date,
  profilePicture: String,
  preferences: {
    theme: String, // Enum: ['light', 'dark'], default: 'light'
    notifications: {
      email: Boolean, // Default: true
      push: Boolean // Default: true
    }
  },
  status: String, // Enum: ['active', 'inactive', 'suspended'], default: 'active'
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration (for email verification)
SMTP_SECURE=true
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=pramod@codespions.com
SMTP_PASSWORD=sswyyhytchr
SMTP_FROM_EMAIL=pramod@codespions.com
SMTP_FROM_NAME=Test BG App

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

## Email Templates

### OTP Email Template
The system sends a beautifully formatted HTML email with:
- Company branding
- Clear OTP code display
- Security warnings
- Expiration time
- Professional styling

### Welcome Email Template
After successful verification, users receive:
- Welcome message
- Account activation confirmation
- Feature overview
- Support information

## Security Features

1. **OTP Expiration**: OTPs expire after 10 minutes (configurable)
2. **One-time Use**: OTPs are invalidated after successful verification
3. **Rate Limiting**: Built-in protection against spam
4. **Secure Storage**: OTPs are hashed and stored securely
5. **Email Validation**: Proper email format validation
6. **Account Status**: Users can be suspended/inactive

## Testing with MailDev

For local development, the system uses MailDev (already configured in docker-compose.yml):

1. **Start MailDev**: `docker-compose up maildev`
2. **Access Web UI**: http://localhost:1080
3. **SMTP Server**: localhost:1025

All emails will be captured in MailDev for testing purposes.

## Production Setup

For production, configure a real SMTP service:

```env
# Production SMTP (example with Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your App Name
```

## Error Handling

The system handles various error scenarios:

1. **User Already Exists**: Prevents duplicate registrations
2. **Invalid OTP**: Handles expired or incorrect OTPs
3. **Email Send Failure**: Graceful handling of SMTP issues
4. **Database Errors**: Proper error responses
5. **Network Issues**: Timeout and retry logic

## Frontend Integration

### Registration Flow
```javascript
// 1. Register user
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name })
});

// 2. Show OTP input form
// 3. Verify OTP
const verifyResponse = await fetch('/api/v1/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, otp })
});

// 4. Redirect to login or auto-login
```

### Login Flow
```javascript
// 1. Attempt login
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// 2. Check if verification required
if (loginResponse.requiresVerification) {
  // Redirect to verification page
  // Or show verification modal
}
```

## Monitoring and Logs

The system logs important events:
- User registrations
- OTP generations
- Email send attempts
- Verification attempts
- Login attempts
- Error conditions

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check SMTP configuration
   - Verify MailDev is running
   - Check firewall settings

2. **OTP Not Working**
   - Check expiration time
   - Verify database connection
   - Check OTP format

3. **Login Failing After Verification**
   - Check user status in database
   - Verify SuperTokens session
   - Check middleware configuration

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
```

This provides detailed logs for troubleshooting.

## Best Practices

1. **Rate Limiting**: Implement rate limiting for OTP requests
2. **Email Templates**: Customize email templates for your brand
3. **Monitoring**: Set up monitoring for email delivery
4. **Backup**: Regular database backups
5. **Security**: Regular security audits
6. **Testing**: Comprehensive testing of the flow

## Future Enhancements

Potential improvements:
1. **SMS OTP**: Add SMS verification option
2. **Social Login**: Integrate with social providers
3. **2FA**: Add two-factor authentication
4. **Password Reset**: Implement password reset flow
5. **Account Recovery**: Add account recovery options
