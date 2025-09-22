# RCA Generation Agent

This agent handles the generation of Root Cause Analysis (RCA) reports in two formats:

1. **Technical RCA** - Detailed technical analysis for internal teams
2. **Customer-Friendly Summary** - Simplified summary for customer communication

## Features

- **Technical RCA Generation**: Creates comprehensive technical RCA reports following industry standard format
- **Customer-Friendly Summary**: Generates non-technical summaries using the existing ticket-resolution agent
- **Streaming Support**: Real-time streaming of RCA generation via WebSockets
- **Validation**: Input validation for all RCA fields and ticket data
- **Modular Design**: Uses shared components for consistency

## Usage

### Basic Usage

```javascript
const { service } = require('./agents/rca-generation');

// Generate complete RCA (both technical and customer-friendly)
const result = await service.generateCompleteRCA(ticketData, rcaFields);

// Generate only technical RCA
const technicalResult = await service.generateTechnicalRCA(ticketData, rcaFields);

// Generate only customer summary (requires existing technical RCA)
const summaryResult = await service.generateCustomerSummary(technicalRCA, ticketData);
```

### Streaming Usage

```javascript
// Generate RCA with real-time streaming
const result = await service.generateStreamingRCA(ticketData, rcaFields, socketId);
```

## Input Format

### Ticket Data
```javascript
{
  ticket_id: "INC0001234",
  short_description: "System outage affecting multiple users",
  description: "Detailed description...",
  category: "Infrastructure",
  priority: "High",
  impact: "Major",
  source: "ServiceNow"
}
```

### RCA Fields
```javascript
{
  problem: "Description of the problem",
  timeline: "Timeline of events",
  impact: "Impact assessment", 
  rootCause: "Root cause analysis",
  correctiveActions: "Corrective actions taken"
}
```

## Output Format

### Technical RCA
- Follows industry standard RCA format
- Includes Issue Identification, Findings, Additional Details, and Corrective Action Plan
- Professional technical language
- Structured with clear sections

### Customer-Friendly Summary
- Simple, non-technical language
- Focuses on customer impact and resolution
- Concise but informative
- Reassuring tone

## WebSocket Events

- `rca_generation` - Streaming content chunks
- `rca_progress` - Progress updates
- `rca_complete` - Generation completion
- `rca_error` - Error notifications

## Configuration

See `config.js` for detailed configuration options including:
- LLM settings
- Streaming parameters
- Validation rules
- WebSocket events
