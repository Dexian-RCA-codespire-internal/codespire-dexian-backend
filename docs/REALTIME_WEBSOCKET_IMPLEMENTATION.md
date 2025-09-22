# Real-Time WebSocket Implementation

This document describes the real-time WebSocket implementation that replaces the polling mechanism for ticket updates.

## Overview

The system now uses WebSocket connections to push real-time ticket updates from the backend to the frontend, eliminating the need for constant API polling and providing instant updates when new tickets are created or existing tickets are modified.

## Architecture

### Backend Components

1. **WebSocket Service** (`src/services/websocketService.js`)
   - Manages Socket.IO server instance
   - Handles client connections and disconnections
   - Emits real-time events for ticket updates
   - Supports room-based messaging

2. **Modified Polling Service** (`src/services/servicenowPollingService.js`)
   - Now emits WebSocket events when new tickets are found
   - Sends polling status updates to connected clients
   - Provides real-time notifications for polling events

3. **Modified Ingestion Service** (`src/services/servicenowIngestionService.js`)
   - Emits WebSocket events when individual tickets are saved/updated
   - Provides granular real-time updates for each ticket operation

4. **Updated App Server** (`src/app.js`)
   - Integrates WebSocket server with HTTP server
   - Initializes WebSocket service on startup

### Frontend Components

1. **WebSocket Service** (`src/services/websocketService.js`)
   - Manages Socket.IO client connection
   - Handles connection states and reconnection logic
   - Provides event listener management

2. **WebSocket Hook** (`src/hooks/useWebSocket.js`)
   - React hook for managing WebSocket connections
   - Manages ticket state and real-time updates
   - Handles notifications and connection status

3. **Notification Components**
   - `NotificationToast.jsx`: Individual notification display
   - `NotificationContainer.jsx`: Container for multiple notifications

4. **Updated RCA Dashboard** (`src/pages/RCADashboard.jsx`)
   - Integrates real-time ticket updates
   - Shows WebSocket connection status
   - Displays new ticket indicators
   - Removes polling logic

## Event Types

### Backend Events (Emitted)

1. **ticket_update**
   - `type: 'new_ticket'` - When a new ticket is created
   - `type: 'updated_ticket'` - When an existing ticket is updated
   - Contains full ticket data

2. **polling_status**
   - Contains polling operation results
   - Includes counts of new/updated tickets
   - Provides error information if polling fails

3. **notification**
   - General system notifications
   - Success/error/warning messages
   - User-friendly notifications

### Frontend Events (Received)

1. **ticket_update** - Real-time ticket updates
2. **polling_status** - Polling operation status
3. **notification** - System notifications
4. **connection** - Connection status changes
5. **connection_error** - Connection error events

## Configuration

### Backend Environment Variables

```env
# WebSocket configuration
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
CORS_CREDENTIALS=true

# ServiceNow polling (still used for fetching new tickets)
SERVICENOW_ENABLE_POLLING=true
SERVICENOW_POLLING_INTERVAL=*/1 * * * *  # Every minute
```

### Frontend Environment Variables

```env
VITE_BACKEND_URL=http://localhost:3000
```

## Usage

### Starting the Backend

```bash
cd codespire-dexian-backend
npm start
```

The WebSocket server will automatically start on the same port as the HTTP server.

### Starting the Frontend

```bash
cd codespire-dexian-frontend
npm run dev
```

The frontend will automatically connect to the WebSocket server.

### Testing WebSocket Connection

1. Open the RCA Dashboard in your browser
2. Check the connection status indicator (bottom-right corner)
3. Look for "Real-time connected" status in the header
4. New tickets from ServiceNow will appear instantly without page refresh

## Features

### Real-Time Updates
- New tickets appear instantly when created in ServiceNow
- Ticket updates are pushed immediately to all connected clients
- No need for manual refresh or polling intervals

### Connection Management
- Automatic reconnection on connection loss
- Connection status indicators
- Error handling and user notifications

### Visual Indicators
- New tickets are highlighted with green background and "New" badge
- Connection status shown in header and bottom-right corner
- Real-time notifications for system events

### Backward Compatibility
- API endpoints still work for initial data loading
- Pagination still uses API calls
- Manual refresh button available

## Troubleshooting

### Connection Issues

1. **WebSocket not connecting**
   - Check CORS configuration in backend
   - Verify backend URL in frontend environment
   - Check browser console for connection errors

2. **No real-time updates**
   - Verify ServiceNow polling is enabled
   - Check backend logs for WebSocket events
   - Ensure tickets are being created in ServiceNow

3. **Connection drops frequently**
   - Check network stability
   - Verify server resources
   - Review WebSocket timeout settings

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=socket.io:*
```

## Performance Considerations

1. **Connection Limits**: Socket.IO handles multiple connections efficiently
2. **Event Frequency**: Events are only emitted when actual changes occur
3. **Memory Usage**: Client-side state management is optimized
4. **Network Usage**: WebSocket is more efficient than frequent HTTP polling

## Security

1. **CORS Configuration**: Properly configured for allowed origins
2. **Authentication**: WebSocket connections inherit HTTP authentication
3. **Rate Limiting**: Consider implementing rate limiting for WebSocket events
4. **Input Validation**: All WebSocket events are validated

## Future Enhancements

1. **Room-based Updates**: Subscribe to specific ticket types or sources
2. **User-specific Notifications**: Filter notifications by user preferences
3. **Offline Support**: Queue updates when connection is lost
4. **Analytics**: Track WebSocket usage and performance metrics


