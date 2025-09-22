# Frontend Session Verification Guide

## 🔍 How to Verify Sessions in Frontend

### 1. **Using SuperTokens Frontend SDK (Recommended)**

#### Installation
```bash
npm install supertokens-auth-react
```

#### Basic Session Verification
```javascript
import Session from "supertokens-auth-react/recipe/session";

// Check if user is logged in
const isLoggedIn = Session.doesSessionExist();

// Get session data
const sessionData = await Session.getAccessTokenPayloadSecurely();

// Get user info
const userId = sessionData.sub;
const roles = sessionData["st-role"]?.v || [];
const permissions = sessionData["st-perm"]?.v || [];
```

#### Complete Session Verification Component
```javascript
import React, { useState, useEffect } from 'react';
import Session from "supertokens-auth-react/recipe/session";

const SessionVerification = () => {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        if (Session.doesSessionExist()) {
          const payload = await Session.getAccessTokenPayloadSecurely();
          setSessionData(payload);
        } else {
          setError('No active session');
        }
      } catch (err) {
        setError('Session verification failed');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  if (loading) return <div>Verifying session...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Session Information</h3>
      <p>User ID: {sessionData?.sub}</p>
      <p>Roles: {sessionData?.["st-role"]?.v?.join(', ') || 'None'}</p>
      <p>Permissions: {sessionData?.["st-perm"]?.v?.join(', ') || 'None'}</p>
    </div>
  );
};
```

### 2. **Using Custom Backend Endpoint**

#### API Call to Verify Session
```javascript
const verifySession = async () => {
  try {
    const response = await fetch('/api/v1/users/verify-session', {
      method: 'GET',
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.data; // Contains session and user info
    } else if (response.status === 401) {
      // Session expired or invalid
      return null;
    } else {
      throw new Error('Session verification failed');
    }
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
};
```

#### Complete Session Hook
```javascript
import { useState, useEffect } from 'react';

const useSession = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const verifySession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/users/verify-session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setSession(data.data.session);
        setError(null);
      } else if (response.status === 401) {
        setUser(null);
        setSession(null);
        setError('Session expired');
      } else {
        throw new Error('Session verification failed');
      }
    } catch (err) {
      setError(err.message);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  return {
    user,
    session,
    loading,
    error,
    refreshSession: verifySession,
    isLoggedIn: !!user,
    hasRole: (role) => user?.roles?.includes(role) || false,
    hasPermission: (permission) => user?.permissions?.includes(permission) || false
  };
};

export default useSession;
```

### 3. **Using the Hook in Components**

```javascript
import React from 'react';
import useSession from './hooks/useSession';

const Dashboard = () => {
  const { user, session, loading, error, isLoggedIn, hasRole } = useSession();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isLoggedIn) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.firstName || user.name}!</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>Status: {user.status}</p>
      
      {hasRole('admin') && (
        <div>
          <h2>Admin Panel</h2>
          {/* Admin-only content */}
        </div>
      )}
      
      {hasRole('moderator') && (
        <div>
          <h2>Moderator Tools</h2>
          {/* Moderator-only content */}
        </div>
      )}
    </div>
  );
};
```

### 4. **Route Protection**

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import useSession from './hooks/useSession';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isLoggedIn, hasRole } = useSession();

  if (loading) return <div>Loading...</div>;
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Usage
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>
```

### 5. **Session Refresh and Error Handling**

```javascript
const useSessionWithRefresh = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const verifySession = async () => {
    try {
      const response = await fetch('/api/v1/users/verify-session', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        return true;
      } else if (response.status === 401) {
        // Session expired, redirect to login
        window.location.href = '/login';
        return false;
      } else {
        throw new Error('Session verification failed');
      }
    } catch (error) {
      console.error('Session error:', error);
      return false;
    }
  };

  // Auto-refresh session every 5 minutes
  useEffect(() => {
    const interval = setInterval(verifySession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { user, verifySession };
};
```

## 🔧 API Endpoints for Session Verification

### 1. **GET /api/v1/users/verify-session**
- **Purpose**: Verify current session and get complete user info
- **Authentication**: Required (cookie-based)
- **Response**: Complete user data with roles and permissions

### 2. **GET /auth/session** (SuperTokens built-in)
- **Purpose**: Get basic session information
- **Authentication**: Required (cookie-based)
- **Response**: Basic session data

## 🚨 Error Handling

### Common Error Scenarios:
1. **401 Unauthorized**: Session expired or invalid
2. **404 Not Found**: User deleted but session still exists
3. **500 Internal Error**: Server-side session verification failed

### Error Handling Example:
```javascript
const handleSessionError = (error, response) => {
  if (response?.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (response?.status === 404) {
    // User deleted, clear local storage and redirect
    localStorage.clear();
    window.location.href = '/login';
  } else {
    // Show error message
    console.error('Session error:', error);
  }
};
```

## 📱 Mobile/React Native Considerations

For React Native, use the appropriate SuperTokens SDK:
```bash
npm install supertokens-auth-react-native
```

The session verification logic remains similar, but use the React Native specific imports and methods.

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Set secure cookie flags** (handled by SuperTokens)
3. **Implement proper CORS** settings
4. **Validate sessions on sensitive operations**
5. **Use short session timeouts** for sensitive applications
6. **Implement proper logout** that clears all session data
