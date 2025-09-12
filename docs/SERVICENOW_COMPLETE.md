# ServiceNow Integration - Complete Documentation

This comprehensive document covers all aspects of the ServiceNow integration system, including ingestion, polling, bulk import, and pagination functionality.

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [API Endpoints](#api-endpoints)
4. [Data Normalization](#data-normalization)
5. [Database Schema](#database-schema)
6. [Bulk Import](#bulk-import)
7. [Polling Service](#polling-service)
8. [Pagination](#pagination)
9. [Usage Examples](#usage-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

## Overview

The ServiceNow integration system provides comprehensive ticket management capabilities through multiple components:

- **ServiceNow Ingestion Service**: Handles API communication and data normalization
- **Bulk Import**: Fetches ALL tickets during application startup
- **Polling Service**: Automatically syncs new/updated tickets at regular intervals
- **Pagination Support**: Flexible API pagination for large datasets
- **Tickets Model**: MongoDB schema for storing normalized ticket data
- **Controller & Routes**: HTTP request handlers and API endpoints

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# ServiceNow Configuration
SERVICENOW_URL=https://your-instance.service-now.com
SERVICENOW_USERNAME=your-username
SERVICENOW_PASSWORD=your-password
SERVICENOW_API_ENDPOINT=/api/now/table/incident
SERVICENOW_TIMEOUT=30000

# Query Configuration
SERVICENOW_QUERY_LIMIT=100
SERVICENOW_QUERY=
SERVICENOW_FIELDS=sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags

# Output Configuration
OUTPUT_FILENAME=tickets.json
MAX_RECORDS=10

# Bulk Import Configuration
SERVICENOW_ENABLE_BULK_IMPORT=true
SERVICENOW_BULK_IMPORT_BATCH_SIZE=1000

# Polling Configuration
SERVICENOW_ENABLE_POLLING=true
SERVICENOW_POLLING_INTERVAL=*/1 * * * *  # Every minute
SERVICENOW_POLLING_BATCH_SIZE=100
SERVICENOW_MAX_RETRIES=3
SERVICENOW_RETRY_DELAY=5000
```

## API Endpoints

### Connection & Sync Operations

#### Test Connection
```http
GET /servicenow/test-connection
```
Tests the connection to ServiceNow API.

**Response:**
```json
{
  "success": true,
  "message": "ServiceNow connection successful",
  "data": { ... }
}
```

#### Fetch Incidents (API Only)
```http
GET /servicenow/incidents?limit=100&query=state=1
```
Fetches incidents from ServiceNow without saving to database.

**Query Parameters:**
- `limit`: Number of records per request (default: 100)
- `query`: ServiceNow query string
- `fields`: Comma-separated list of fields to return

#### Sync Incidents
```http
POST /servicenow/sync?limit=100&query=state=1
```
Fetches incidents from ServiceNow and syncs them to MongoDB.

**Response:**
```json
{
  "success": true,
  "message": "Incidents synced successfully",
  "data": {
    "synced": 10,
    "created": 8,
    "updated": 2,
    "errors": 0,
    "total": 10
  }
}
```

### Ticket Management

#### Get All Tickets (with Pagination)
```http
GET /api/v1/servicenow/tickets?page=1&limit=10&status=New&priority=1
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)
- `offset`: Number of tickets to skip
- `status`: Filter by status
- `priority`: Filter by priority
- `source`: Filter by source
- `assigned_to`: Filter by assignee ID
- `requester`: Filter by requester ID
- `query`: ServiceNow query filter
- `fields`: Comma-separated list of fields to return
- `useMaxRecords`: Whether to respect MAX_RECORDS config limit

**Response:**
```json
{
  "success": true,
  "message": "Tickets fetched successfully. Total: 10 tickets",
  "data": [
    {
      "number": "INC001",
      "short_description": "Sample ticket",
      "state": "Open",
      // ... other ticket fields
    }
  ],
  "total": 10,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true,
    "nextOffset": 10
  }
}
```

#### Get Ticket by ID
```http
GET /servicenow/tickets/:id
```

#### Get Open Tickets
```http
GET /servicenow/tickets/open
```

#### Get Closed Tickets
```http
GET /servicenow/tickets/closed
```

#### Get Tickets by Source
```http
GET /servicenow/tickets/source/:source
```

#### Get Sync Statistics
```http
GET /servicenow/tickets/stats
```

**Response:**
```json
{
  "success": true,
  "message": "Sync statistics retrieved successfully",
  "data": {
    "totalTickets": 150,
    "statusDistribution": {
      "New": 25,
      "In Progress": 30,
      "Closed": 95
    },
    "lastSyncTime": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Update Ticket Status
```http
PATCH /servicenow/tickets/:id/status
```

**Request Body:**
```json
{
  "status": "Resolved",
  "notes": "Issue has been resolved"
}
```

### Polling Service Endpoints

#### Get Polling Status
```http
GET /api/v1/servicenow-polling/status
```

#### Start Polling
```http
POST /api/v1/servicenow-polling/start
```

#### Stop Polling
```http
POST /api/v1/servicenow-polling/stop
```

#### Trigger Manual Poll
```http
POST /api/v1/servicenow-polling/poll
```

#### Reset Polling State
```http
POST /api/v1/servicenow-polling/reset
Content-Type: application/json

{
  "confirm": true
}
```

Resets the polling state to start from 24 hours ago. Use with caution.

### Bulk Import Endpoints

#### Get Bulk Import Status
```http
GET /api/v1/servicenow-polling/bulk-import/status
```

Returns current bulk import status including:
- Completion status
- Last import time
- Total tickets imported

**Response:**
```json
{
  "success": true,
  "message": "Bulk import status retrieved successfully",
  "data": {
    "hasCompleted": true,
    "lastImportTime": "2024-01-15T10:30:00.000Z",
    "totalImported": 2500
  }
}
```

#### Trigger Manual Bulk Import
```http
POST /api/v1/servicenow-polling/bulk-import/start
Content-Type: application/json

{
  "force": false,
  "batchSize": 1000,
  "query": "state=Open"
}
```

Manually triggers bulk import operation.

**Request Body:**
- `force`: Force re-import even if already completed (default: false)
- `batchSize`: Number of tickets per batch (default: 1000)
- `query`: ServiceNow query filter (optional)

#### Reset Bulk Import State
```http
POST /api/v1/servicenow-polling/bulk-import/reset
Content-Type: application/json

{
  "confirm": true
}
```

Resets bulk import state to allow re-import. Use with caution.

## Data Normalization

The ingestion service normalizes ServiceNow data to match our database schema:

### Field Mapping

| ServiceNow Field | Database Field | Transformation |
|------------------|----------------|----------------|
| `number` | `ticket_id` | Direct mapping |
| - | `source` | Always "ServiceNow" |
| `short_description` | `short_description` | Direct mapping |
| `description` | `description` | Direct mapping |
| `category` | `category` | Direct mapping |
| `subcategory` | `subcategory` | Direct mapping |
| `state` | `status` | Mapped to enum values |
| `priority` | `priority` | Converted to string |
| `impact` | `impact` | Converted to string |
| `urgency` | `urgency` | Converted to string |
| `opened_at` | `opened_time` | Converted to Date |
| `closed_at` | `closed_time` | Converted to Date |
| `resolved_at` | `resolved_time` | Converted to Date |
| `caller_id` | `requester` | Extracted ID, name, email |
| `assigned_to` | `assigned_to` | Extracted ID, name, email |
| `assignment_group` | `assignment_group` | Extracted ID, name |
| `company` | `company` | Extracted ID, name |
| `location` | `location` | Extracted ID, name |
| `tags` | `tags` | Converted to array |
| - | `raw` | Full original payload |

### Status Mapping

| ServiceNow State | Database Status |
|------------------|-----------------|
| 1 | New |
| 2 | In Progress |
| 3 | Pending |
| 4 | Resolved |
| 5 | Closed |
| 6 | Cancelled |
| 7 | Closed |

## Database Schema

### Tickets Collection

```javascript
{
  "ticket_id": "INC0000060",
  "source": "ServiceNow",
  "short_description": "Unable to connect to email",
  "description": "I am unable to connect to the email server...",
  "category": "inquiry",
  "subcategory": "email",
  "status": "Closed",
  "priority": "3",
  "impact": "2",
  "urgency": "2",
  "opened_time": "2016-12-12T15:19:57.000Z",
  "closed_time": "2016-12-14T02:46:44.000Z",
  "resolved_time": "2016-12-13T21:43:14.000Z",
  "requester": { 
    "id": "681ccaf9c0a8016400b98a06818d57c7",
    "name": "John Doe",
    "email": "john.doe@company.com"
  },
  "assigned_to": { 
    "id": "5137153cc611227c000bbd1bd8cd2007",
    "name": "Jane Smith",
    "email": "jane.smith@company.com"
  },
  "assignment_group": { 
    "id": "287ebd7da9fe198100f92cc8d1d2154e",
    "name": "IT Support"
  },
  "company": { 
    "id": "31bea3d53790200044e0bfc8bcbe5dec",
    "name": "Acme Corp"
  },
  "location": { 
    "id": null,
    "name": ""
  },
  "tags": ["urgent", "email"],
  "raw": { /* full original ticket JSON */ },
  "last_sync_time": "2024-01-15T10:30:00.000Z",
  "sync_status": "synced"
}
```

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

## Bulk Import

The bulk import feature fetches ALL tickets from ServiceNow for initial setup, with intelligent guardrails to prevent unnecessary re-imports.

### Features

- **No Pagination Limits**: Fetches ALL tickets regardless of count
- **Large Batch Processing**: Uses configurable batch sizes (default: 1000)
- **Smart Startup Logic**: Only runs on first startup, skips subsequent restarts
- **State Tracking**: Tracks completion status in database
- **Manual Control**: API endpoints for manual bulk import operations
- **Progress Logging**: Detailed logging of import progress
- **Error Handling**: Continues processing even if individual tickets fail
- **Upsert Logic**: Updates existing tickets or creates new ones

### How It Works

#### Startup Sequence

1. **Application Starts**: Server initializes
2. **Bulk Import Check**: Checks if bulk import has already been completed
3. **Bulk Import Runs**: If not completed and enabled, fetches ALL tickets (first time only)
4. **Polling Starts**: If enabled, begins incremental polling
5. **Server Ready**: Application is fully operational

#### Import Process

1. **Batch Fetching**: Fetches tickets in large batches (default: 1000)
2. **Progress Logging**: Logs progress for each batch
3. **Database Operations**: Saves/updates tickets in database
4. **Error Handling**: Continues processing even if some tickets fail
5. **Completion Report**: Logs final statistics

### Performance Considerations

| Connection Speed | Recommended Batch Size | Notes |
|------------------|------------------------|-------|
| Slow (DSL/Cable) | 100-500 | Smaller batches, longer processing time |
| Medium (Fiber) | 500-1000 | Balanced approach |
| Fast (Enterprise) | 1000-2000 | Larger batches, faster processing |

### Comparison with Polling

| Feature | Bulk Import | Polling |
|---------|-------------|---------|
| **Purpose** | Initial setup | Ongoing sync |
| **Frequency** | Once on startup | Every minute |
| **Data Volume** | ALL tickets | New/updated only |
| **Performance** | High resource usage | Low resource usage |
| **Use Case** | First-time setup | Continuous operation |

## Polling Service

The polling service automatically fetches new and updated tickets from ServiceNow at regular intervals using a timestamp-based approach.

### Features

- **Efficient Polling**: Only fetches tickets created or updated since the last successful poll
- **Configurable Intervals**: Supports cron expressions for flexible scheduling
- **Error Handling**: Automatic retry logic with configurable failure thresholds
- **State Management**: Tracks polling state in MongoDB for persistence
- **Manual Controls**: API endpoints for starting, stopping, and manual polling
- **Monitoring**: Comprehensive status reporting and error tracking

### How It Works

#### Timestamp-Based Filtering

The service uses ServiceNow's `sys_created_on` and `sys_updated_on` fields to filter tickets:

```javascript
const query = `sys_created_on>=${lastSyncTime}^ORsys_updated_on>=${lastSyncTime}`;
```

This ensures only new or recently updated tickets are fetched.

#### State Management

The service maintains a `PollingState` document in MongoDB that tracks:
- Last successful sync timestamp
- Poll statistics (total, successful, failed)
- Error information
- Active status

#### Error Handling

- Automatic retry on failures
- Configurable retry limits
- Service auto-disables after max retries
- Comprehensive error logging

## Pagination

The `/api/v1/servicenow/tickets` endpoint supports flexible pagination to control the number of tickets returned per request.

### Pagination Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | integer | Number of tickets to fetch (default: 10) | `?limit=20` |
| `offset` | integer | Number of tickets to skip from the beginning | `?offset=20` |
| `page` | integer | Page number (1-based). Calculates offset automatically | `?page=2` |

### Usage Examples

#### Page-based Pagination
```bash
# First page (tickets 1-10)
curl "http://localhost:3000/api/v1/servicenow/tickets?page=1&limit=10"

# Second page (tickets 11-20)
curl "http://localhost:3000/api/v1/servicenow/tickets?page=2&limit=10"
```

#### Offset-based Pagination
```bash
# Skip first 20 tickets, fetch next 10
curl "http://localhost:3000/api/v1/servicenow/tickets?offset=20&limit=10"
```

### Recommended Limits

- **Small datasets**: 10-50 tickets per request
- **Medium datasets**: 50-100 tickets per request
- **Large datasets**: 100-500 tickets per request

## Usage Examples

### Basic Sync
```javascript
const servicenowIngestionService = require('./src/services/servicenowIngestionService');

// Test connection
const connectionTest = await servicenowIngestionService.testConnection();
console.log('Connection test:', connectionTest);

// Sync incidents
const syncResult = await servicenowIngestionService.syncIncidents({
  limit: 50,
  query: 'state=1^ORstate=2' // Open tickets only
});
console.log('Sync result:', syncResult);
```

### Bulk Import
```javascript
const { bulkImportAllTickets } = require('./src/services/servicenowIngestionService');

// Basic bulk import
const result = await bulkImportAllTickets();

// With custom options
const result = await bulkImportAllTickets({
  batchSize: 500,
  query: 'state=Open' // Only import open tickets
});
```

### Frontend Table Pagination
```javascript
async function loadTicketsPage(page, pageSize) {
  const response = await fetch(
    `/api/v1/servicenow/tickets?page=${page}&limit=${pageSize}`
  );
  const data = await response.json();
  
  return {
    tickets: data.data,
    hasMore: data.pagination.hasMore,
    totalPages: Math.ceil(data.total / pageSize)
  };
}
```

### Batch Processing
```javascript
async function processAllTickets() {
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `/api/v1/servicenow/tickets?offset=${offset}&limit=${limit}`
    );
    const data = await response.json();
    
    // Process tickets
    await processTickets(data.data);
    
    hasMore = data.pagination.hasMore;
    offset = data.pagination.nextOffset || offset + limit;
  }
}
```

## Best Practices

### When to Use Each Feature

#### Bulk Import
✅ **Good for:**
- Initial application setup
- Complete data synchronization
- One-time data migration
- Full ticket inventory

❌ **Avoid for:**
- Regular operations (use polling instead)
- Frequent restarts
- Development/testing (unless needed)

#### Polling
✅ **Good for:**
- Continuous synchronization
- Real-time updates
- Production environments
- Ongoing operations

#### Pagination
✅ **Good for:**
- Large datasets
- Frontend applications
- API integrations
- Performance optimization

### Configuration Tips

1. **Initial Setup**: Enable both bulk import and polling
   ```bash
   SERVICENOW_ENABLE_BULK_IMPORT=true
   SERVICENOW_ENABLE_POLLING=true
   ```

2. **After Setup**: Keep both enabled (bulk import won't run again automatically)
   ```bash
   SERVICENOW_ENABLE_BULK_IMPORT=true  # Safe to keep enabled
   SERVICENOW_ENABLE_POLLING=true
   ```

3. **Manual Re-import**: Use API endpoints when needed
   ```bash
   # Check status
   curl http://localhost:3000/api/v1/servicenow-polling/bulk-import/status
   
   # Force re-import
   curl -X POST http://localhost:3000/api/v1/servicenow-polling/bulk-import/start \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

4. **Performance Tuning**:
   - Use appropriate batch sizes
   - Monitor API rate limits
   - Consider polling frequency vs. data freshness needs

### Security Best Practices

- Use dedicated ServiceNow service account
- Store credentials securely in environment variables
- Rotate credentials regularly
- Monitor access logs
- Consider IP whitelisting for ServiceNow access

## Troubleshooting

### Common Issues

#### Bulk Import Issues

1. **Import Takes Too Long**
   - Increase batch size
   - Check network connection
   - Monitor ServiceNow API performance

2. **Memory Issues**
   - Decrease batch size
   - Monitor system resources
   - Consider running during off-peak hours

3. **API Rate Limiting**
   - Decrease batch size
   - Increase delay between batches
   - Check ServiceNow API limits

#### Polling Issues

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

#### Pagination Issues

1. **Invalid Parameters**
   - Check limit and offset values
   - Verify parameter types
   - Review API documentation

2. **Performance Issues**
   - Reduce limit size
   - Optimize database queries
   - Check ServiceNow API performance

### Debug Commands

```bash
# Test connection
curl -X GET http://localhost:3000/servicenow/test-connection

# Check polling status
curl http://localhost:3000/api/v1/servicenow-polling/status

# Trigger manual poll
curl -X POST http://localhost:3000/api/v1/servicenow-polling/poll

# Test pagination
curl "http://localhost:3000/api/v1/servicenow/tickets?page=1&limit=10"

# Check database count
mongo
> db.tickets.countDocuments({source: "ServiceNow"})
```

### Logging

The system provides detailed logging for all operations:

#### Bulk Import Logs
```
🚀 Starting bulk import of ALL tickets from ServiceNow...
🔧 Bulk import settings:
   - Batch size: 1000
   - Query filter: None (all tickets)
📄 Fetching batch 1 (records 1 to 1000)...
✅ Fetched 1000 tickets (Total: 1000)
✅ ServiceNow bulk import completed successfully:
   - Total tickets imported: 2500
   - New tickets: 2500
   - Updated tickets: 0
   - Errors: 0
```

#### Polling Logs
```
🔄 Starting ServiceNow polling...
📊 Polling completed: 5 new tickets, 2 updated tickets
✅ Polling successful: 7 tickets processed
```

## Security Considerations

### Credential Management
- Store ServiceNow credentials securely in environment variables
- Use dedicated service account with minimal required permissions
- Rotate credentials regularly
- Never commit credentials to version control

### API Security
- Protect API endpoints with authentication
- Implement rate limiting
- Monitor for unusual access patterns
- Use HTTPS for all communications

### Network Security
- Ensure secure connection to ServiceNow
- Consider IP whitelisting
- Monitor network traffic
- Use VPN if required

### Data Protection
- Encrypt sensitive data in transit and at rest
- Implement proper access controls
- Regular security audits
- Monitor for data breaches

### Monitoring
- Set up alerts for failed operations
- Monitor API usage patterns
- Track authentication failures
- Regular security reviews

This comprehensive documentation covers all aspects of the ServiceNow integration system. For specific implementation details, refer to the individual service files in the codebase.
