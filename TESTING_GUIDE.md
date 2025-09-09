# Authentication Flow Testing Guide

This guide will help you test the complete SuperTokens OTP authentication system.

## Prerequisites

1. **Backend Server Running**: Make sure your main backend is running on `http://localhost:3000`
2. **Email Service Configured**: Ensure your SMTP settings are properly configured in your environment variables
3. **SuperTokens Setup**: Verify your SuperTokens configuration is working

## Quick Start

### Option 1: Use the Test Server (Recommended)

1. **Start the test server**:
   ```bash
   node serve-test.js
   ```

2. **Open your browser** and go to: `http://localhost:8080`

3. **Configure API URL** (if needed):
   - The default API URL is `http://localhost:3000/api`
   - Change it in the "API Configuration" section if your backend runs on a different port

### Option 2: Open HTML File Directly

1. **Open the test page**:
   ```bash
   # On Windows
   start test-auth.html
   
   # On Mac
   open test-auth.html
   
   # On Linux
   xdg-open test-auth.html
   ```

2. **Update API URL** in the configuration section to match your backend

## Testing the Complete Flow

### Step 1: Register a New User
1. Go to the **Register** tab
2. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com` (use a real email you can access)
   - Password: `password123`
3. Click **Register**
4. You should see a success message

### Step 2: Verify Email with OTP
1. The page should automatically switch to the **Verify Email** tab
2. Your email should be pre-filled
3. Click **Send OTP**
4. Check your email for the 6-digit OTP code
5. Enter the OTP in the input fields
6. Click **Verify OTP**
7. You should see a success message

### Step 3: Login
1. The page should automatically switch to the **Login** tab
2. Your email should be pre-filled
3. Enter your password
4. Click **Login**
5. You should see a success message and be redirected to the Profile tab

### Step 4: View Profile
1. You should see your user information displayed
2. You can update your name and click **Update Profile**
3. You can **Logout** when done

## Testing Individual Components

### Test OTP Tab
Use this tab to test OTP functionality independently:

1. **Send Test OTP**: Send an OTP to any email
2. **Resend Test OTP**: Resend the OTP if needed
3. **Verify Test OTP**: Enter the OTP code to verify
4. **Check Verification Status**: Check if an email is verified

## Troubleshooting

### Common Issues

1. **"Failed to send OTP"**
   - Check your SMTP configuration
   - Verify email service is working
   - Check server logs for errors

2. **"Invalid OTP code"**
   - Make sure you're entering the correct 6-digit code
   - Check if the OTP has expired (usually 10 minutes)
   - Try resending the OTP

3. **"User already exists"**
   - The email is already registered
   - Try with a different email or go to login

4. **"Email not verified"**
   - Complete the email verification step first
   - Check your email for the OTP

5. **CORS Errors**
   - Make sure your backend has CORS enabled
   - Check if the API URL is correct

### Backend Issues

1. **SuperTokens Connection Issues**
   - Verify your SuperTokens connection URI
   - Check if SuperTokens service is running
   - Verify your API key

2. **Database Issues**
   - Check MongoDB connection
   - Verify database is accessible
   - Check user model configuration

3. **Email Service Issues**
   - Verify SMTP credentials
   - Check email service configuration
   - Test email service independently

## API Endpoints Tested

The test page covers all these endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/send-otp` - Send OTP for verification
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/resend-otp` - Resend OTP code
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - User logout
- `POST /api/auth/check-verification` - Check verification status

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# SuperTokens
SUPERTOKENS_CONNECTION_URI=your_connection_uri
SUPERTOKENS_API_KEY=your_api_key
SUPERTOKENS_APP_NAME=your_app_name
SUPERTOKENS_API_DOMAIN=localhost:3000
SUPERTOKENS_APP_DOMAIN=localhost:8080

# Email Service
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_NAME=Your App Name
SMTP_FROM_EMAIL=your_from_email

# Database
MONGODB_URI=your_mongodb_uri
```

## Success Indicators

You'll know everything is working when:

1. ✅ User registration completes successfully
2. ✅ OTP email is received in your inbox
3. ✅ OTP verification works
4. ✅ Login is successful
5. ✅ Profile information is displayed correctly
6. ✅ Profile updates work
7. ✅ Logout works properly

## Next Steps

Once testing is complete:

1. **Frontend Integration**: Use the API patterns shown in the test page for your actual frontend
2. **Production Setup**: Configure production email service and SuperTokens
3. **Security Review**: Review and implement additional security measures
4. **Error Handling**: Implement comprehensive error handling in your frontend

## Support

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Check the backend server logs
3. Verify all environment variables are set correctly
4. Test individual API endpoints using tools like Postman
5. Review the SuperTokens documentation for configuration issues
