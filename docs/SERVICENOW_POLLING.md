# ServiceNow Polling Service

This document describes the ServiceNow polling service that automatically fetches new and updated tickets from ServiceNow at regular intervals.

## Overview

The polling service uses a timestamp-based approach to efficiently fetch only new or updated tickets, avoiding duplicate processing of existing data.

## Features

- **Efficient Polling**: Only fetches tickets created or updated since the last successful poll
- **Configurable Intervals**: Supports cron expressions for flexible scheduling
- **Error Handling**: Automatic retry logic with configurable failure thresholds
- **State Management**: Tracks polling state in MongoDB for persistence
- **Manual Controls**: API endpoints for starting, stopping, and manual polling
- **Monitoring**: Comprehensive status reporting and error tracking

## Configuration

Add these environment variables to your `.env` file:

```bash
# Enable/disable ServiceNow polling
SERVICENOW_ENABLE_POLLING=true

# Polling interval (cron expression)
SERVICENOW_POLLING_INTERVAL=*/1 * * * *  # Every minute

# Number of tickets to fetch per poll batch
SERVICENOW_POLLING_BATCH_SIZE=100

# Maximum number of consecutive failures before disabling polling
SERVICENOW_MAX_RETRIES=3

# Delay between retry attempts (milliseconds)
SERVICENOW_RETRY_DELAY=5000

# Existing ServiceNow configuration (required)
SERVICENOW_URL=https://your-instance.service-now.com
SERVICENOW_USERNAME=your_username
SERVICENOW_PASSWORD=your_password
SERVICENOW_API_ENDPOINT=/api/now/table/incident
SERVICENOW_TIMEOUT=30000
```

## API Endpoints

### Get Polling Status
```
GET /api/v1/servicenow-polling/status
```

Returns current polling service status including:
- Running state
- Last sync time
- Poll statistics
- Error information

### Start Polling
```
POST /api/v1/servicenow-polling/start
```

Starts the polling service if not already running.

### Stop Polling
```
POST /api/v1/servicenow-polling/stop
```

Stops the polling service.

### Trigger Manual Poll
```
POST /api/v1/servicenow-polling/poll
```

Manually triggers a single poll operation.

### Reset Polling State
```
POST /api/v1/servicenow-polling/reset
Content-Type: application/json

{
  "confirm": true
}
```

Resets the polling state to start from 24 hours ago. Use with caution.

## How It Works

### Timestamp-Based Filtering

The service uses ServiceNow's `sys_created_on` and `sys_updated_on` fields to filter tickets:

```javascript
const query = `sys_created_on>=${lastSyncTime}^ORsys_updated_on>=${lastSyncTime}`;
```

This ensures only new or recently updated tickets are fetched.

### State Management

The service maintains a `PollingState` document in MongoDB that tracks:
- Last successful sync timestamp
- Poll statistics (total, successful, failed)
- Error information
- Active status

### Error Handling

- Automatic retry on failures
- Configurable retry limits
- Service auto-disables after max retries
- Comprehensive error logging

## Database Schema

### PollingState Collection

```javascript
{
  service: "servicenow",
  lastSyncTime: Date,
  lastSuccessfulPoll: Date,
  totalPolls: Number,
  successfulPolls: Number,
  failedPolls: Number,
  lastError: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Monitoring

### Logs

The service provides detailed logging:
- Poll start/completion
- Ticket counts (new/updated)
- Error details
- State changes

### Metrics

Track these key metrics:
- Poll frequency and success rate
- Ticket processing volume
- Error rates and types
- Sync lag time

## Best Practices

### Performance
- Use appropriate batch sizes (100-500 tickets)
- Monitor API rate limits
- Consider polling frequency vs. data freshness needs

### Reliability
- Set up monitoring for failed polls
- Implement alerting for service failures
- Regular health checks

### Security
- Use dedicated ServiceNow service account
- Rotate credentials regularly
- Monitor access logs

## Troubleshooting

### Common Issues

1. **No tickets being fetched**
   - Check ServiceNow credentials
   - Verify API endpoint URL
   - Check query permissions

2. **Polling stops unexpectedly**
   - Check error logs
   - Verify max retry settings
   - Check ServiceNow API availability

3. **Duplicate tickets**
   - Verify timestamp filtering is working
   - Check for timezone issues
   - Review polling state

### Debug Commands

```bash
# Check polling status
curl http://localhost:3000/api/v1/servicenow-polling/status

# Trigger manual poll
curl -X POST http://localhost:3000/api/v1/servicenow-polling/poll

# Reset polling state (if needed)
curl -X POST http://localhost:3000/api/v1/servicenow-polling/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

## Security Considerations

- ServiceNow credentials are stored in environment variables
- API endpoints should be protected with authentication
- Consider IP whitelisting for ServiceNow access
- Monitor for unusual polling patterns

## Performance Tuning

### For High Volume
- Increase batch size
- Optimize database indexes
- Consider Redis for state caching
- Use connection pooling

### For Low Latency
- Decrease polling interval
- Implement real-time webhooks (if available)
- Use smaller batch sizes
- Optimize query performance
