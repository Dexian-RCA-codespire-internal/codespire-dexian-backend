# ServiceNow Ingestion Layer

This document describes the ServiceNow ingestion layer that pulls ticket data from ServiceNow and normalizes it into our database schema.

## Overview

The ServiceNow ingestion layer consists of:
- **ServiceNow Ingestion Service**: Handles API communication and data normalization
- **Tickets Model**: MongoDB schema for storing normalized ticket data
- **Controller**: HTTP request handlers for ingestion operations
- **Routes**: API endpoints for managing the ingestion process

## Configuration

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

#### Get All Tickets
```http
GET /servicenow/tickets?page=1&limit=10&status=New&priority=1
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)
- `status`: Filter by status
- `priority`: Filter by priority
- `source`: Filter by source
- `assigned_to`: Filter by assignee ID
- `requester`: Filter by requester ID

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

### Using the API
```bash
# Test connection
curl -X GET http://localhost:3000/servicenow/test-connection

# Sync incidents
curl -X POST http://localhost:3000/servicenow/sync?limit=100

# Get tickets
curl -X GET http://localhost:3000/servicenow/tickets?status=New&limit=20

# Get sync statistics
curl -X GET http://localhost:3000/servicenow/tickets/stats
```

## Error Handling

The ingestion service includes comprehensive error handling:

- **Connection errors**: Network timeouts, authentication failures
- **Data validation errors**: Invalid field formats, missing required fields
- **Database errors**: Duplicate keys, constraint violations
- **API rate limiting**: Automatic delays between requests

All errors are logged with detailed information for debugging.

## Performance Considerations

- **Pagination**: Fetches data in configurable chunks (default: 100 records)
- **Rate limiting**: 100ms delay between API requests
- **Batch processing**: Processes multiple tickets in a single sync operation
- **Indexing**: Database indexes on frequently queried fields
- **Memory management**: Streams large datasets to avoid memory issues

## Monitoring

The service provides several monitoring endpoints:

- **Sync statistics**: Track sync performance and data distribution
- **Connection health**: Monitor ServiceNow API connectivity
- **Error tracking**: Log and track sync errors
- **Performance metrics**: Monitor sync duration and throughput
