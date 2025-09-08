# SuperTokens Authentication Setup

This document explains how to set up and use SuperTokens authentication in the test-bg project.

## Overview

SuperTokens is a complete authentication solution that provides:
- Email/Password authentication
- Session management
- User metadata storage
- Built-in security features
- Easy integration with Express.js

## Prerequisites

1. **SuperTokens Core Service**: You need to run the SuperTokens core service locally or use the hosted version.
2. **Database**: SuperTokens requires a PostgreSQL database for storing user data and sessions.

## Environment Variables

Add the following variables to your `.env` file:

```env
# SuperTokens Configuration
SUPERTOKENS_CONNECTION_URI=http://localhost:3567
SUPERTOKENS_API_KEY=your-super-secret-api-key-here
SUPERTOKENS_APP_NAME=test-bg
SUPERTOKENS_APP_DOMAIN=http://localhost:3000
SUPERTOKENS_API_DOMAIN=http://localhost:3000

# PostgreSQL Configuration (for SuperTokens)
POSTGRES_USER=supertokens
POSTGRES_PASSWORD=supertokens123
POSTGRES_DB=supertokens
```

## Setup Instructions

### 1. Install SuperTokens Core

You can run SuperTokens core using Docker:

```bash
# Create a docker-compose file for SuperTokens core
version: '3.8'
services:
  supertokens:
    image: registry.supertokens.io/supertokens/supertokens-postgresql
    ports:
      - "3567:3567"
    environment:
      POSTGRESQL_CONNECTION_URI: "postgresql://supertokens:supertokens123@postgres:5432/supertokens"
    depends_on:
      - postgres

  postgres:
    image: postgres:13
    environment:
      POSTGRES_USER: supertokens
      POSTGRES_PASSWORD: supertokens123
      POSTGRES_DB: supertokens
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 2. Start SuperTokens Core

```bash
docker-compose up -d
```

### 3. Configure Your Application

The application is already configured with SuperTokens. The main configuration is in `src/config/supertokens.js`.

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Logout User
```http
POST /api/v1/auth/logout
Authorization: Bearer <session-token>
```

#### Get User Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <session-token>
```

#### Update User Profile
```http
PUT /api/v1/auth/profile
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "name": "Updated Name"
}
```

## Frontend Integration

### Using SuperTokens Frontend SDK

1. Install the frontend SDK:
```bash
npm install supertokens-auth-react supertokens-node
```

2. Initialize SuperTokens in your frontend:
```javascript
import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";

SuperTokens.init({
  appInfo: {
    appName: "test-bg",
    apiDomain: "http://localhost:3000",
    websiteDomain: "http://localhost:3000",
  },
  recipeList: [
    EmailPassword.init(),
  ],
});
```

3. Use the authentication components:
```jsx
import { EmailPasswordAuth } from "supertokens-auth-react/recipe/emailpassword";

function App() {
  return (
    <EmailPasswordAuth>
      <YourApp />
    </EmailPasswordAuth>
  );
}
```

### Manual API Calls

If you prefer to handle authentication manually:

```javascript
// Register
const register = async (email, password, name) => {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });
  return response.json();
};

// Login
const login = async (email, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

// Get profile (requires session)
const getProfile = async () => {
  const response = await fetch('/api/v1/auth/profile', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });
  return response.json();
};
```

## Security Features

SuperTokens provides several built-in security features:

1. **Session Management**: Automatic session creation and validation
2. **Password Hashing**: Secure password hashing using bcrypt
3. **CSRF Protection**: Built-in CSRF protection
4. **Rate Limiting**: Configurable rate limiting
5. **Secure Cookies**: Secure cookie settings for production

## Customization

### Adding Custom User Fields

You can store additional user data using UserMetadata:

```javascript
const { UserMetadata } = require('supertokens-node/recipe/usermetadata');

// Store custom data
await UserMetadata.updateUserMetadata(userId, {
  role: 'admin',
  preferences: { theme: 'dark' }
});

// Retrieve custom data
const metadata = await UserMetadata.getUserMetadata(userId);
```

### Custom Validation

You can add custom validation rules in the auth controller:

```javascript
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({ min: 2 })
];
```

## Troubleshooting

### Common Issues

1. **Connection Error**: Make sure SuperTokens core is running on port 3567
2. **Database Error**: Ensure PostgreSQL is running and accessible
3. **CORS Issues**: Check CORS configuration in your app.js
4. **Session Issues**: Verify cookie settings and domain configuration

### Debug Mode

Enable debug mode by setting:
```env
NODE_ENV=development
```

This will provide more detailed error messages.

## Production Considerations

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure API Key**: Use a strong, unique API key
3. **Database Security**: Secure your PostgreSQL database
4. **Cookie Settings**: Configure secure cookie settings
5. **Rate Limiting**: Implement rate limiting for production

## Additional Resources

- [SuperTokens Documentation](https://supertokens.com/docs)
- [SuperTokens GitHub](https://github.com/supertokens/supertokens-core)
- [SuperTokens Community](https://discord.gg/supertokens)
