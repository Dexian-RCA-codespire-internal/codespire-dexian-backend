# SLA Frontend Integration Guide

## ✅ Integration Status: COMPLETE

The SLA monitoring system has **full frontend integration** with real-time notifications and WebSocket events.

## Issue Fixed

**Problem**: The notification model was rejecting SLA notifications because the `eventType` enum didn't include SLA event types.

**Solution**: Updated the Notification model to include `'sla_warning'`, `'sla_critical'`, and `'sla_breached'` in the valid eventType enum values.

## Frontend Components Already Integrated

### 1. **SLA Dashboard Components**
- `SLADashboardWidget.jsx` - Main SLA overview widget
- `SLAQuickStats.jsx` - Quick statistics display
- `SLA.jsx` - Full SLA management page
- `SLASearch.jsx` & `SLAFilters.jsx` - Search and filtering

### 2. **Real-time WebSocket Integration**
- `useSLAWebSocket.js` - Custom hook for SLA-specific WebSocket events
- Listens for: `sla:warning`, `sla:critical`, `sla:breach`
- Provides real-time updates to all SLA components

### 3. **Notification System**
- `useNotifications.js` - Notification management hook
- `NotificationPortal.jsx` - Notification display component
- Toast notifications for SLA status changes

## Backend WebSocket Events (Working)

The SLA monitoring service now emits specific WebSocket events:

```javascript
// Warning phase (20-60% time elapsed)
socket.emit('sla:warning', {
  ticketId: 'INC001',
  priority: 'P1',
  status: 'warning',
  timeLeft: '2h 30m',
  percentage: 45,
  message: 'Ticket INC001 (P1) has reached SLA warning phase'
})

// Critical phase (60-100% time elapsed)
socket.emit('sla:critical', {
  ticketId: 'INC002',
  priority: 'P2', 
  status: 'critical',
  timeLeft: '1h 15m',
  percentage: 75,
  message: 'Ticket INC002 (P2) has reached SLA critical phase'
})

// Breach phase (100%+ time elapsed)
socket.emit('sla:breach', {
  ticketId: 'INC003',
  priority: 'P1',
  status: 'breached',
  timeLeft: 'Overdue by 2h',
  percentage: 150,
  message: 'Ticket INC003 (P1) has breached SLA deadline'
})
```

## Notification Database Integration

**Fixed**: SLA notifications are now properly stored in the MongoDB notifications collection with:

```javascript
{
  title: "⚠️ SLA Warning",
  message: "Ticket INC001 (P1) has reached SLA warning phase - 45% time elapsed, 2h 12m remaining",
  type: "warning",
  related: {
    ticketMongoId: ObjectId,
    ticket_id: "INC001",
    eventType: "sla_warning"  // ✅ Now valid
  },
  metadata: {
    slaStatus: "warning",
    priority: "P1",
    timeLeft: "2h 12m",
    percentage: 45,
    source: "sla_monitoring"
  }
}
```

## Frontend User Experience

### Real-time Updates
- **Dashboard**: SLA metrics update automatically without page refresh
- **Notification Bell**: Shows unread count including SLA notifications
- **Notification Portal**: Displays SLA notifications in the notification list
- **Toast Notifications**: Shows popup alerts when tickets enter new SLA phases
- **Visual Indicators**: SLA status icons and colors update in real-time

### Notification Types
- 🟡 **Warning Toast**: "⚠️ SLA Warning: Ticket INC001"
- 🟠 **Critical Toast**: "🔥 Critical SLA Alert: Ticket INC002"  
- 🔴 **Breach Toast**: "🚨 SLA Breach: Ticket INC003"
- 🔔 **Notification Bell**: Shows persistent notifications in portal

## Configuration

### Environment Variables (.env)
```bash
# SLA Monitoring Configuration
SLA_MONITORING_ENABLED=true
SLA_MONITORING_INTERVAL=*/5 * * * *
SLA_P1_HOURS=4
SLA_P2_HOURS=12
SLA_P3_HOURS=24
SLA_WARNING_THRESHOLD=20
SLA_CRITICAL_THRESHOLD=60
```

## How It Works

### 1. **Backend Monitoring**
- Cron job runs every 5 minutes (configurable)
- Checks all open tickets for SLA status
- Calculates time elapsed vs. priority-based deadlines

### 2. **Notification Triggering**
- Sends notification when ticket enters new phase using `notificationService.createAndBroadcast()`
- Prevents duplicate notifications using `last_notification_status`
- Creates persistent notification in MongoDB
- Emits WebSocket events for real-time updates

### 3. **Frontend Display**
- **Notification Portal**: Shows SLA notifications in the notification bell dropdown
- **Toast Messages**: Popup alerts for immediate attention
- **Dashboard Updates**: Live SLA metrics refresh
- **Status Indicators**: Real-time visual updates

## Testing Integration

### Manual Test
```bash
# Trigger manual SLA check
curl -X POST http://localhost:5000/v1/sla/monitoring/check

# Check monitoring status
curl http://localhost:5000/v1/sla/monitoring/status

# View statistics
curl http://localhost:5000/v1/sla/monitoring/stats
```

### Frontend Verification
1. **Open Frontend**: Navigate to your application
2. **Check Notification Bell**: Look for notification count indicator
3. **Open Notification Portal**: Click the bell icon to see SLA notifications
4. **Check SLA Dashboard**: Navigate to `/sla` to see live SLA metrics
5. **Wait for Updates**: SLA monitoring runs every 5 minutes

## Implementation Details

### Files Fixed
- `src/models/Notification.js` - Added SLA event types to enum
- `src/services/slaMonitoringService.js` - Enhanced WebSocket event emission
- `src/services/websocketService.js` - Added dedicated SLA emit methods

### Frontend Files (Already Working)
- `src/hooks/useSLAWebSocket.js` - WebSocket event handling
- `src/hooks/useNotifications.js` - Notification management
- `src/components/notifications/NotificationPortal.jsx` - Notification display
- `src/components/SLA/SLADashboardWidget.jsx` - Real-time dashboard
- `src/pages/SLA.jsx` - Main SLA page with live updates

## Summary

**✅ Complete Integration Working!** 

The SLA monitoring system now provides:

- ✅ **Real-time SLA monitoring** with live dashboard updates
- ✅ **Persistent notifications** stored in MongoDB notifications collection
- ✅ **Notification portal integration** showing SLA alerts in the bell icon
- ✅ **Toast notifications** for immediate alerts
- ✅ **WebSocket-based communication** for instant updates
- ✅ **Configurable SLA targets** and notification thresholds
- ✅ **Complete user interface** for SLA management

The frontend will automatically start receiving and displaying SLA notifications in both the notification portal and as toast messages once your backend server restarts to pick up the model changes.