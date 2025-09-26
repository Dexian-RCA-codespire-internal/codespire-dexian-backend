# RCA Root Cause Analysis Agent

A specialized RAG (Retrieval-Augmented Generation) agent designed to analyze IT tickets and identify potential root causes with supporting evidence and confidence scores.

## Overview

This agent leverages the shared RAG components and LLM providers to analyze current tickets against historical data, identifying the most likely root causes based on symptoms, patterns, and technical analysis.

## Features

- **Intelligent Root Cause Analysis**: Analyzes ticket symptoms to identify technical root causes
- **Evidence-Based Findings**: Provides specific evidence that operations teams can investigate
- **Confidence Scoring**: Assigns confidence percentages based on symptom correlation and historical patterns
- **Historical Context**: Uses similar tickets to improve analysis accuracy
- **Structured Output**: Returns standardized JSON format for easy integration

## API Endpoints

### POST `/api/rca-root-cause/analyze`

Analyzes a current ticket to identify potential root causes.

**Request Body:**
```json
{
  "currentTicket": {
    "category": "Network Infrastructure",
    "description": "Critical network connectivity issues affecting multiple services...",
    "short_description": "Network connectivity issues causing service degradation",
    "enhanced_problem": "The network infrastructure is experiencing severe connectivity disruptions...",
    "priority": "High",
    "urgency": "Critical",
    "impact": [
      "Service degradation affecting 80% of users",
      "Multiple application timeouts"
    ],
    "source": "ServiceNow"
  },
  "similarTickets": [
    {
      "id": "INC-2024-1234",
      "short_description": "Database connection pool exhaustion",
      "category": "Database",
      "priority": "High",
      "description": "Connection pool reached maximum capacity during high traffic periods"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Root cause analysis completed successfully",
  "results": [
    {
      "id": 1,
      "rootCause": "BGP Routing Configuration Error",
      "analysis": "Network infrastructure failure due to misconfigured BGP routing tables deployed during maintenance window...",
      "confidence": 95,
      "evidence": [
        {
          "type": "Historical Pattern Analysis", 
          "finding": "Similar network infrastructure failure pattern identified with matching symptoms",
          "source": "INC-2024-9012"
        }
      ]
    }
  ],
  "analysis_metadata": {
    "total_root_causes": 4,
    "highest_confidence": 95,
    "average_confidence": 82,
    "ticket_category": "Network Infrastructure",
    "similar_tickets_analyzed": 3
  }
}
```

### GET `/api/rca-root-cause/capabilities`

Returns agent capabilities and supported operations.

### GET `/api/rca-root-cause/health`

Health check endpoint for monitoring agent status.

## Input Requirements

### Current Ticket (Required)
- `category`: Ticket category (e.g., "Network Infrastructure", "Database")
- `description`: Detailed description of the issue
- `short_description`: Brief summary of the problem
- `priority`: Priority level (optional)
- `urgency`: Urgency level (optional)
- `impact`: Array of impact statements (optional)
- `enhanced_problem`: Enhanced problem statement (optional)
- `source`: Source system (optional)

### Similar Tickets (Optional)
Array of historical tickets with:
- `id`: Unique ticket identifier
- `short_description`: Brief description
- `category`: Ticket category
- `description`: Detailed description
- `priority`: Priority level

## Output Format

Each identified root cause includes:

- **id**: Unique identifier for the root cause
- **rootCause**: Clear, specific title of the root cause
- **analysis**: Detailed technical explanation (30-100 words)
- **confidence**: Confidence percentage (0-100)
- **evidence**: Array of supporting evidence items

### Evidence Structure
- **type**: Category of evidence (e.g., "Historical Pattern Analysis", "Similar Incident Analysis", "Performance Correlation")
- **finding**: Specific evidence description that supports the root cause
- **source**: **Ticket ID** when analysis is based on similar ticket patterns (e.g., "INC-2024-1234"), or system name for direct technical evidence

## Supported Root Cause Categories

The agent identifies root causes in these technical areas:

- **Configuration Issues**: Misconfigurations, deployment errors, settings changes
- **Capacity Problems**: Resource exhaustion, scaling issues, performance bottlenecks
- **Network Issues**: Connectivity problems, routing issues, latency spikes
- **Database Problems**: Connection issues, query performance, deadlocks
- **Application Bugs**: Memory leaks, code defects, logic errors
- **Hardware Issues**: Equipment failures, degradation, maintenance
- **Security Problems**: Certificate expiry, access issues, vulnerability exploits
- **Service Dependencies**: External service failures, API issues, integration problems

## Usage Examples

### Basic Usage
```javascript
const rcaRootCauseAgent = require('./src/agents/rca-root-cause');

const currentTicket = {
  category: "Database",
  description: "Database connection timeouts occurring frequently...",
  short_description: "Database connection timeout errors"
};

const result = await rcaRootCauseAgent.analyzeRootCauses(currentTicket, []);
console.log(result.results);
```

### With Similar Tickets
```javascript
const similarTickets = [
  {
    id: "INC-2024-1234",
    category: "Database",
    description: "Previous connection pool issue..."
  }
];

const result = await rcaRootCauseAgent.analyzeRootCauses(currentTicket, similarTickets);
```

## Configuration

The agent uses the shared RAG configuration with customizations:

```javascript
const RCA_CONFIG = {
  textProcessing: {
    fieldWeights: {
      description: 0.4,
      enhanced_problem: 0.3,
      short_description: 0.2,
      category: 0.1
    }
  },
  validation: {
    requiredFields: ['category', 'description', 'short_description'],
    textFields: {
      short_description: { min: 5, max: 500 },
      description: { min: 10, max: 2000 }
    }
  }
};
```

## Testing

Run the test example:

```bash
node src/agents/rca-root-cause/test-example.js
```

This will demonstrate:
- Agent capabilities
- Root cause analysis with sample data
- Input validation testing
- Complete JSON response structure

## Integration Notes

1. **LLM Provider**: Uses Gemini LLM with low temperature (0.2) for consistent analysis
2. **Validation**: Comprehensive input validation using shared utilities
3. **Error Handling**: Graceful error handling with structured responses
4. **Swagger Documentation**: Complete API documentation available at `/api/docs`

## Dependencies

- **Shared RAG Components**: Uses `../shared` utilities for LLM, validation, and formatting
- **LangChain Google GenAI**: For LLM operations
- **Express.js**: For REST API endpoints

## Error Handling

The agent handles various error scenarios:

- Invalid input data (missing required fields)
- LLM service unavailability
- JSON parsing errors
- Network connectivity issues
- Validation failures

All errors return structured responses with appropriate HTTP status codes and error details.