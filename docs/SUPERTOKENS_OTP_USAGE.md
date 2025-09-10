# SuperTokens OTP & Magic Link Implementation Guide

This document explains how to use the new SuperTokens OTP and Magic Link verification system that has been implemented in the backend.

## Overview

The verification system now uses SuperTokens' Passwordless recipe with `USER_INPUT_CODE_AND_MAGIC_LINK` flow, which provides:
- Secure OTP generation and validation
- Magic link verification
- Built-in rate limiting and security features
- Integration with your existing email service
- Session management
- User choice between OTP or Magic Link verification

## API Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/auth/send-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email address",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

**Important:** Store the `deviceId` and `preAuthSessionId` from the response as they are required for verification and resending.

### 2. Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully! You can now log in to your account.",
  "user": {
    "id": "user_id_123",
    "email": "user@example.com",
    "name": "User Name",
    "isEmailVerified": true
  }
}
```

### 3. Resend OTP

**Endpoint:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP resent successfully to your email address",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

### 4. Send Magic Link

**Endpoint:** `POST /api/auth/send-magic-link`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent successfully to your email address",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

### 5. Verify Magic Link

**Endpoint:** `POST /api/auth/verify-magic-link`

**Request Body:**
```json
{
  "linkCode": "magic_link_code_from_email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link verified successfully! You can now log in to your account.",
  "user": {
    "id": "user_id_123",
    "email": "user@example.com",
    "name": "User Name",
    "isEmailVerified": true
  }
}
```

### 6. Resend Magic Link

**Endpoint:** `POST /api/auth/resend-magic-link`

**Request Body:**
```json
{
  "email": "user@example.com",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link resent successfully to your email address",
  "deviceId": "device_12345",
  "preAuthSessionId": "session_67890"
}
```

### 7. Check Verification Status

**Endpoint:** `POST /api/auth/check-verification`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "email": "user@example.com",
  "isEmailVerified": true,
  "user": {
    "id": "user_id_123",
    "email": "user@example.com",
    "name": "User Name",
    "isEmailVerified": true
  }
}
```

## Frontend Integration Example

### React/JavaScript Example

```javascript
class VerificationService {
  constructor() {
    this.otpData = {
      deviceId: null,
      preAuthSessionId: null
    };
    this.magicLinkData = {
      deviceId: null,
      preAuthSessionId: null
    };
  }

  // OTP Methods
  async sendOTP(email) {
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Store deviceId and preAuthSessionId for verification
        this.otpData.deviceId = data.deviceId;
        this.otpData.preAuthSessionId = data.preAuthSessionId;
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async verifyOTP(email, otp) {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          deviceId: this.otpData.deviceId,
          preAuthSessionId: this.otpData.preAuthSessionId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async resendOTP(email) {
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          deviceId: this.otpData.deviceId,
          preAuthSessionId: this.otpData.preAuthSessionId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update stored IDs in case they changed
        this.otpData.deviceId = data.deviceId;
        this.otpData.preAuthSessionId = data.preAuthSessionId;
      }
      
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // Magic Link Methods
  async sendMagicLink(email) {
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Store deviceId and preAuthSessionId for resending
        this.magicLinkData.deviceId = data.deviceId;
        this.magicLinkData.preAuthSessionId = data.preAuthSessionId;
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async verifyMagicLink(linkCode) {
    try {
      const response = await fetch('/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkCode,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async resendMagicLink(email) {
    try {
      const response = await fetch('/api/auth/resend-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          deviceId: this.magicLinkData.deviceId,
          preAuthSessionId: this.magicLinkData.preAuthSessionId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update stored IDs in case they changed
        this.magicLinkData.deviceId = data.deviceId;
        this.magicLinkData.preAuthSessionId = data.preAuthSessionId;
      }
      
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }
}

// Usage example
const verificationService = new VerificationService();

// Send OTP
const sendOTPResult = await verificationService.sendOTP('user@example.com');
if (sendOTPResult.success) {
  console.log('OTP sent successfully');
} else {
  console.error('Failed to send OTP:', sendOTPResult.error);
}

// Verify OTP
const verifyOTPResult = await verificationService.verifyOTP('user@example.com', '123456');
if (verifyOTPResult.success) {
  console.log('Email verified successfully with OTP');
} else {
  console.error('OTP verification failed:', verifyOTPResult.error);
}

// Send Magic Link
const sendMagicLinkResult = await verificationService.sendMagicLink('user@example.com');
if (sendMagicLinkResult.success) {
  console.log('Magic link sent successfully');
} else {
  console.error('Failed to send magic link:', sendMagicLinkResult.error);
}

// Verify Magic Link (linkCode comes from the email link)
const verifyMagicLinkResult = await verificationService.verifyMagicLink('link_code_from_email');
if (verifyMagicLinkResult.success) {
  console.log('Email verified successfully with magic link');
} else {
  console.error('Magic link verification failed:', verifyMagicLinkResult.error);
}
```

## Error Handling

The API returns specific error messages for different scenarios:

- **Invalid OTP:** "Invalid OTP code"
- **Expired OTP:** "OTP code has expired"
- **User not found:** "User not found"
- **Missing parameters:** "Email, OTP, deviceId, and preAuthSessionId are required"
- **Email already verified:** "Email is already verified"

## Security Features

SuperTokens OTP implementation provides:

1. **Rate Limiting:** Built-in protection against brute force attacks
2. **Secure Code Generation:** Cryptographically secure OTP generation
3. **Expiration Handling:** Automatic OTP expiration (configurable)
4. **Session Management:** Secure session handling for verification flow
5. **Device Tracking:** Device-specific OTP sessions for enhanced security

## Configuration

The OTP system is configured in `src/config/supertokens.js`:

```javascript
Passwordless.init({
  contactMethod: 'EMAIL',
  flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK', // Enables both OTP and magic link functionality
  emailDelivery: {
    service: {
      sendEmail: async (input) => {
        // Integration with your email service
        const { email, userInputCode, urlWithLinkCode } = input;
        
        if (userInputCode) {
          // Send OTP email
          const result = await emailService.sendOTPEmail(email, email, userInputCode);
        } else if (urlWithLinkCode) {
          // Send magic link email
          const result = await emailService.sendMagicLinkEmail(email, email, urlWithLinkCode);
        }
        // ... error handling
      },
    },
  },
})
```

## Migration from Custom OTP

If you were using the previous custom OTP implementation:

1. **Frontend Changes Required:**
   - Update API calls to include `deviceId` and `preAuthSessionId`
   - Store these values between send and verify operations
   - Update error handling for new error messages

2. **Backend Changes:**
   - The custom OTP functions have been replaced with SuperTokens OTP
   - Email service integration remains the same
   - Database schema changes are not required

## Testing

You can test the OTP functionality using the provided endpoints. Make sure your email service is properly configured in your environment variables.

## Troubleshooting

1. **OTP not received:** Check email service configuration and SMTP settings
2. **Verification fails:** Ensure `deviceId` and `preAuthSessionId` are correctly passed
3. **Session errors:** Check SuperTokens configuration and connection URI

For more information, refer to the [SuperTokens Passwordless documentation](https://supertokens.com/docs/passwordless/introduction).
