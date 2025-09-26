# SLA Monitoring System

This implementation provides automated SLA monitoring for tickets with real-time notifications via WebSocket and persistent storage in MongoDB.

## Overview

The SLA monitoring system tracks ticket timelines based on priority levels and sends notifications when tickets enter different phases of their SLA lifecycle.

## Features

- **Automated SLA Monitoring**: Runs every 5 minutes (configurable) to check all open tickets
- **Priority-based SLA Targets**:
  - P1 (Critical): 4 hours
  - P2 (High): 12 hours 
  - P3 (Low): 24 hours
- **Phase-based Notifications**:
  - **Warning**: 20-60% of SLA time elapsed
  - **Critical**: 60-100% of SLA time elapsed
  - **Breached**: >100% of SLA time elapsed
- **Duplicate Prevention**: Tracks last notification status to avoid spam
- **Real-time Updates**: WebSocket integration for live notifications
- **Persistent Storage**: Notifications saved in MongoDB

## Architecture

### Core Components

1. **SLA Monitoring Service** (`src/services/slaMonitoringService.js`)
   - Main monitoring logic and cron job management
   - SLA status calculation algorithms
   - Notification decision logic

2. **SLA Monitoring Controller** (`src/controllers/slaMonitoringController.js`)
   - HTTP API endpoints for service control
   - Manual trigger capabilities
   - Status and statistics endpoints

3. **SLA Model** (`src/models/SLA.js`)
   - Enhanced with notification tracking fields
   - `last_notification_status`: Prevents duplicate alerts
   - `last_notification_time`: Tracks when last alert was sent

4. **API Routes** (`src/routes/slaMonitoring.js`)
   - `/sla/monitoring/status` - Get service status
   - `/sla/monitoring/start` - Start monitoring
   - `/sla/monitoring/stop` - Stop monitoring
   - `/sla/monitoring/check` - Manual trigger
   - `/sla/monitoring/stats` - Get statistics

## SLA Calculation Logic

### Time Phases
```
0-20%: Safe (no notification)
20-60%: Warning (⚠️ notification)
60-100%: Critical (🚨 notification)
>100%: Breached (💥 notification)
```

### Notification Rules
- **First Notification**: Sent when ticket enters warning, critical, or breached phase
- **Progression Notifications**: Only sent when moving to more severe phase
- **No Regression Notifications**: Moving from critical back to warning doesn't trigger alerts
- **Safe Phase**: Never triggers notifications

## Configuration

### Environment Variables
```bash
# SLA monitoring interval (cron format)
SLA_MONITORING_INTERVAL=*/5 * * * *  # Every 5 minutes (default)

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/codespire_dexian
```

### Service Control
```bash
# Auto-starts with application
npm start

# Manual control via API
POST /v1/sla/monitoring/start
POST /v1/sla/monitoring/stop
POST /v1/sla/monitoring/check
```

## Integration Points

### Notification Service
Uses existing `notificationService.createAndBroadcast()` method to:
- Store notifications in MongoDB
- Broadcast via WebSocket to connected clients
- Support different notification types (warning, error, info)

### WebSocket Service
Integrates with existing WebSocket infrastructure to:
- Send real-time SLA status updates
- Notify about monitoring completion
- Report errors and statistics

## Usage Examples

### API Usage
```javascript
// Get monitoring status
GET /v1/sla/monitoring/status

// Trigger manual check
POST /v1/sla/monitoring/check

// Get monitoring statistics
GET /v1/sla/monitoring/stats
```

### Notification Format
```javascript
{
  title: "⚠️ SLA Warning",
  message: "Ticket INC001 (P1) has reached SLA warning phase - 45% time elapsed, 2h 12m remaining",
  type: "warning",
  related: {
    ticketMongoId: ObjectId,
    ticket_id: "INC001",
    eventType: "sla_warning"
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

## Database Schema Changes

### SLA Collection Updates
```javascript
{
  // Existing fields...
  last_notification_status: {
    type: String,
    enum: ['safe', 'warning', 'critical', 'breached', null],
    default: null
  },
  last_notification_time: {
    type: Date,
    default: null
  }
}
```

## Testing

Run the test suite to verify functionality:
```bash
node src/tests/slaMonitoringTest.js
```

The test creates mock SLA data and verifies:
- ✅ SLA status calculations
- ✅ Notification logic
- ✅ Database operations
- ✅ Full monitoring workflow

## Monitoring and Observability

### Logs
- Service startup/shutdown events
- Monitoring check results
- Individual ticket processing
- Notification sending confirmation
- Error handling and recovery

### Metrics Available
- Total tickets monitored
- Notifications sent per check
- SLA status distribution
- Processing time and performance

### Health Checks
- Service status endpoint
- Database connectivity
- WebSocket integration status
- Error rates and patterns

## Production Considerations

1. **Performance**: Service processes tickets in batches and includes error handling
2. **Scalability**: Configurable monitoring intervals based on system load
3. **Reliability**: Comprehensive error handling and recovery mechanisms
4. **Monitoring**: Full observability with logs, metrics, and health checks
5. **Maintenance**: Manual trigger capabilities for testing and troubleshooting

## Future Enhancements

- Custom SLA targets per customer/category
- Escalation rules for prolonged breaches
- SLA reporting and analytics dashboard
- Integration with external alerting systems
- Smart notification throttling based on business hours