# Ticket Resolution Agent

The Ticket Resolution Agent provides AI-powered ticket resolution capabilities with root cause analysis (RCA) and automatic ServiceNow integration.

## Features

- **AI-Powered Resolution Analysis**: Uses LLM to analyze tickets and determine appropriate close codes
- **Root Cause Analysis**: Processes root cause information to generate customer-friendly summaries
- **ServiceNow Integration**: Automatically updates ServiceNow tickets with resolution data
- **Close Code Determination**: Intelligently selects from predefined close codes
- **Customer Summary Generation**: Creates user-friendly resolution summaries
- **Database Storage**: Stores resolution data in MongoDB for tracking and analytics

## Architecture

```
src/agents/ticket-resolution/
├── config.js              # Configuration settings
├── resolution-agent.js     # Core AI agent logic
├── service.js             # Business logic layer
├── index.js               # Module entry point
└── README.md              # This file
```

## API Endpoints

### Resolve Ticket
**POST** `/api/v1/tickets/resolve`

Resolves a ticket with root cause analysis and updates ServiceNow.

**Request Body:**
```json
{
  "rootCause": "The user was experiencing network connectivity issues due to a misconfigured DNS server. The DNS settings were updated to point to the correct server, resolving the connectivity problem.",
  "ticket": {
    "_id": "68c9042a83cb4146ca6fbd55",
    "ticket_id": "INC0010041",
    "source": "ServiceNow",
    "short_description": "check refactored code - updated",
    "description": "added later",
    "category": "Inquiry / Help",
    "priority": "5 - Planning",
    "impact": "3 - Low",
    "urgency": "3 - Low",
    "raw": {
      "sys_id": "a772c8c583c0ba1062ebb2b6feaad3aa"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket resolved successfully",
  "data": {
    "resolution": {
      "rootCause": "The user was experiencing network connectivity issues...",
      "closeCode": "Solution provided", // From servicenow.CLOSE_CODES.SOLUTION_PROVIDED
      "customerSummary": "Network connectivity issue resolved by updating DNS server configuration.",
      "problemStatement": "Issue: check refactored code - updated\nDescription: added later\nCategory: Inquiry / Help",
      "analysis": "This appears to be a technical issue that was resolved by providing a solution."
    },
    "rcaRecord": { /* MongoDB record */ },
    "serviceNowUpdate": { /* ServiceNow API response */ }
  }
}
```

### Get Resolution by ID
**GET** `/api/v1/tickets/resolution/:id`

Retrieves a resolution record by its MongoDB ID.

### Get Resolution by Ticket Number
**GET** `/api/v1/tickets/resolution/ticket/:ticketNumber?source=ServiceNow`

Retrieves a resolution record by ticket number and source.

### List Resolutions
**GET** `/api/v1/tickets/resolutions?page=1&limit=20&closeCode=Solution provided`

Lists resolutions with filtering and pagination options.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `closeCode`: Filter by close code
- `source`: Filter by source system
- `startDate`: Start date filter (ISO 8601)
- `endDate`: End date filter (ISO 8601)
- `servicenowUpdated`: Filter by ServiceNow update status

### Get Resolution Statistics
**GET** `/api/v1/tickets/resolutions/stats?groupBy=closeCode&startDate=2024-01-01&endDate=2024-12-31`

Retrieves resolution statistics with various grouping options.

### Process Pending ServiceNow Updates
**POST** `/api/v1/tickets/resolutions/process-pending`

Processes any pending ServiceNow updates that may have failed initially.

### Get ServiceNow Statistics
**GET** `/api/v1/tickets/resolutions/servicenow-stats`

Retrieves statistics about ServiceNow update success rates.

### Health Check
**GET** `/api/v1/tickets/resolution/health`

Checks the health status of the resolution service and ServiceNow connectivity.

### Get Capabilities
**GET** `/api/v1/tickets/resolution/capabilities`

Returns information about the service capabilities and supported close codes.

## Close Codes

The agent supports the following close codes:

- **Duplicate**: Issue is a duplicate of another ticket
- **Known error**: Issue is a known problem with existing documentation
- **No resolution provided**: No solution was found or provided
- **Resolved by caller**: Issue was resolved by the caller themselves
- **Resolved by change**: Issue was resolved by implementing a change
- **Resolved by problem**: Issue was resolved by fixing an underlying problem
- **Resolved by request**: Issue was resolved by fulfilling a request
- **Solution provided**: A solution was provided to resolve the issue
- **Workaround provided**: A workaround was provided to resolve the issue
- **User error**: Issue was caused by user error

## Database Schema

### RCAResolved Collection

The agent stores resolution data in the `rcaresolved` MongoDB collection with the following key fields:

```javascript
{
  ticket_id: ObjectId,           // Reference to original ticket
  ticket_number: String,         // Ticket identifier (e.g., "INC0010041")
  source: String,                // Source system ("ServiceNow")
  short_description: String,     // Ticket short description
  description: String,           // Ticket description
  category: String,              // Ticket category
  priority: String,              // Ticket priority
  impact: String,                // Ticket impact
  urgency: String,               // Ticket urgency
  sys_id: String,                // ServiceNow system ID
  root_cause: String,            // Root cause analysis
  close_code: String,            // Determined close code
  customer_summary: String,      // Customer-friendly summary
  problem_statement: String,     // Extracted problem statement
  resolution_analysis: String,   // AI analysis
  resolved_at: Date,             // Resolution timestamp
  servicenow_updated: Boolean,   // ServiceNow update status
  servicenow_update_attempts: Number, // Update retry count
  processing_time_ms: Number,    // Processing time
  // ... additional metadata fields
}
```

## ServiceNow Integration

The agent automatically updates ServiceNow tickets using the following API call:

```bash
curl --location --request PATCH 'https://dev283514.service-now.com/api/now/table/incident/<sys_id>' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic YWJlbC50dXRlcjpTYWdhckAyMDAz' \
--header 'Cookie: glide_user_route=glide.24bdc8acfe46e25d4cede16391cb7676' \
--data '{
    "state": "6", 
    "close_code": "Solution provided", // Use constants from src/constants/servicenow.js
    "close_notes": "Network connectivity issue resolved by updating DNS server configuration."
}'
```

## Configuration

The agent can be configured through the `config.js` file:

```javascript
{
  llm: {
    model: 'gemini-1.5-flash',
    temperature: 0.3,
    maxTokens: 1000
  },
  response: {
    maxSummaryLength: 500,
    minSummaryLength: 50
  },
  closeCodes: {
    // Close code mappings
  },
  validation: {
    // Validation rules
  }
}
```

## Error Handling

The agent includes comprehensive error handling:

- **Validation Errors**: Input validation with detailed error messages
- **LLM Errors**: Fallback parsing when AI analysis fails
- **ServiceNow Errors**: Retry logic with exponential backoff
- **Database Errors**: Graceful handling of MongoDB operations

## Monitoring

The agent provides several monitoring endpoints:

- Health checks for service status
- Statistics for resolution trends
- ServiceNow update success rates
- Processing time metrics

## Usage Example

```javascript
const resolutionService = require('./agents/ticket-resolution/service');

// Resolve a ticket
const result = await resolutionService.resolveTicket(ticket, rootCause);

if (result.success) {
  console.log('Resolution:', result.data.resolution);
  console.log('Close Code:', result.data.resolution.closeCode);
  console.log('Customer Summary:', result.data.resolution.customerSummary);
}
```

## Dependencies

- **LLM Provider**: Uses shared LLM provider for AI analysis
- **MongoDB**: Stores resolution records
- **ServiceNow API**: Updates tickets in ServiceNow
- **Express Validators**: Input validation
- **Authentication**: SuperTokens integration

## Security

- All endpoints require authentication via SuperTokens
- Input validation prevents injection attacks
- ServiceNow credentials are securely managed
- Rate limiting and retry logic prevent API abuse
