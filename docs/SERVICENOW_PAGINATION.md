# ServiceNow API Pagination

This document describes the pagination functionality for the ServiceNow tickets API endpoint.

## Overview

The `/api/v1/servicenow/tickets` endpoint now supports flexible pagination to control the number of tickets returned per request. This allows you to fetch tickets in smaller, manageable chunks instead of being limited by the `MAX_RECORDS` configuration.

## API Endpoint

```
GET /api/v1/servicenow/tickets
```

## Query Parameters

### Pagination Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | integer | Number of tickets to fetch (default: 10) | `?limit=20` |
| `offset` | integer | Number of tickets to skip from the beginning | `?offset=20` |
| `page` | integer | Page number (1-based). Calculates offset automatically | `?page=2` |

### Other Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `query` | string | ServiceNow query filter | `?query=state=Open` |
| `fields` | string | Comma-separated list of fields to return | `?fields=number,short_description` |
| `useMaxRecords` | boolean | Whether to respect MAX_RECORDS config limit | `?useMaxRecords=true` |

## Usage Examples

### Basic Limit
```bash
# Fetch 10 tickets (default)
curl "http://localhost:3000/api/v1/servicenow/tickets"

# Fetch 20 tickets
curl "http://localhost:3000/api/v1/servicenow/tickets?limit=20"
```

### Page-based Pagination
```bash
# First page (tickets 1-10)
curl "http://localhost:3000/api/v1/servicenow/tickets?page=1&limit=10"

# Second page (tickets 11-20)
curl "http://localhost:3000/api/v1/servicenow/tickets?page=2&limit=10"

# Third page (tickets 21-30)
curl "http://localhost:3000/api/v1/servicenow/tickets?page=3&limit=10"
```

### Offset-based Pagination
```bash
# Skip first 20 tickets, fetch next 10
curl "http://localhost:3000/api/v1/servicenow/tickets?offset=20&limit=10"

# Skip first 50 tickets, fetch next 25
curl "http://localhost:3000/api/v1/servicenow/tickets?offset=50&limit=25"
```

### With Filters
```bash
# Fetch 5 open tickets
curl "http://localhost:3000/api/v1/servicenow/tickets?limit=5&query=state=Open"

# Fetch 10 tickets with specific fields
curl "http://localhost:3000/api/v1/servicenow/tickets?limit=10&fields=number,short_description,state"
```

## Response Format

The API response includes pagination metadata:

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
    // ... more tickets
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

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `limit` | integer | Number of tickets requested |
| `offset` | integer | Number of tickets skipped |
| `hasMore` | boolean | Whether there are more tickets available |
| `nextOffset` | integer | Offset for the next page (null if no more data) |

## Behavior Changes

### Before (MAX_RECORDS Limitation)
- All requests were limited by `MAX_RECORDS` configuration (default: 50)
- `limit` parameter was ignored
- No pagination support

### After (Flexible Pagination)
- `limit` parameter is respected
- Supports both page-based and offset-based pagination
- `MAX_RECORDS` limit is optional (use `useMaxRecords=true`)
- Returns pagination metadata

## Migration Guide

### For Existing Integrations

**Old behavior:**
```bash
# This was limited by MAX_RECORDS regardless of limit parameter
curl "http://localhost:3000/api/v1/servicenow/tickets?limit=100"
```

**New behavior:**
```bash
# This now respects the limit parameter
curl "http://localhost:3000/api/v1/servicenow/tickets?limit=100"

# To maintain old behavior (respect MAX_RECORDS)
curl "http://localhost:3000/api/v1/servicenow/tickets?limit=100&useMaxRecords=true"
```

### For New Integrations

Use page-based pagination for better UX:

```javascript
// Fetch first page
const page1 = await fetch('/api/v1/servicenow/tickets?page=1&limit=10');

// Fetch next page
const page2 = await fetch('/api/v1/servicenow/tickets?page=2&limit=10');

// Check if more pages available
if (page1.pagination.hasMore) {
  // Fetch next page
}
```

## Performance Considerations

### Recommended Limits
- **Small datasets**: 10-50 tickets per request
- **Medium datasets**: 50-100 tickets per request
- **Large datasets**: 100-500 tickets per request

### Rate Limiting
- ServiceNow API has rate limits
- Large requests may take longer
- Consider implementing client-side rate limiting

### Memory Usage
- Smaller limits reduce memory usage
- Better for mobile applications
- Improves response times

## Error Handling

### Invalid Parameters
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Invalid limit parameter"
}
```

### ServiceNow API Errors
```json
{
  "success": false,
  "message": "Failed to fetch tickets",
  "error": "ServiceNow API error message"
}
```

## Testing

Use the provided test script to verify pagination functionality:

```bash
node scripts/test-pagination.js
```

This will test various pagination scenarios and validate the response format.

## Best Practices

1. **Use appropriate limits**: Don't request too many tickets at once
2. **Implement client-side pagination**: Use the pagination metadata to build UI
3. **Handle errors gracefully**: Always check the `success` field
4. **Cache results**: Consider caching for better performance
5. **Monitor usage**: Track API usage to avoid rate limits

## Examples for Common Use Cases

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
