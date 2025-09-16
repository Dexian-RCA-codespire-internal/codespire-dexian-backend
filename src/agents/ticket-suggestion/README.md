# Ticket Suggestion Agent

This module provides AI-powered ticket resolution suggestions based on similar past tickets.

## Overview

The Ticket Suggestion Agent analyzes patterns from similar tickets to generate actionable resolution suggestions for new tickets. It's designed to work seamlessly with the Ticket Similarity Agent to provide a complete solution for IT support teams.

## Architecture

```
src/agents/ticket-suggestion/
├── index.js              # Module entry point and exports
├── search-agent.js       # Core AI processing logic
├── service.js            # Business logic layer
├── config.js             # Configuration settings
└── README.md             # This documentation
```

## Components

### 1. Search Agent (`search-agent.js`)
- **Purpose**: Core AI processing for generating suggestions
- **Features**:
  - LLM initialization and management
  - Prompt engineering for suggestion generation
  - Response parsing and validation
  - Health checking
  - Input validation

### 2. Service (`service.js`)
- **Purpose**: Business logic layer and API orchestration
- **Features**:
  - Request validation and processing
  - Response formatting
  - Error handling
  - Batch processing support
  - Custom suggestion generation

### 3. Configuration (`config.js`)
- **Purpose**: Centralized configuration management
- **Features**:
  - Suggestion settings (max suggestions, ticket limits)
  - LLM configuration
  - Validation schemas
  - API endpoint definitions

### 4. Index (`index.js`)
- **Purpose**: Module entry point and convenience methods
- **Features**:
  - Clean API exports
  - Backward compatibility
  - Convenience methods

## Usage

### Basic Usage
```javascript
const ticketSuggestion = require('../agents/ticket-suggestion');

// Generate suggestions
const result = await ticketSuggestion.generateTicketSuggestions(
    similarTickets, 
    currentTicket
);
```

### Service Usage
```javascript
const suggestionService = require('../agents/ticket-suggestion/service');

// Generate suggestions with full service features
const result = await suggestionService.generateTicketSuggestions(
    similarTickets, 
    currentTicket
);
```

### Direct Agent Usage
```javascript
const searchAgent = require('../agents/ticket-suggestion/search-agent');

// Direct AI processing
const suggestions = await searchAgent.generateTicketSuggestions(
    similarTickets, 
    currentTicket
);
```

## API Integration

The module integrates with the existing API through the controller:

```javascript
// In ticketSimilarityController.js
const suggestionService = require('../agents/ticket-suggestion/service');

const results = await suggestionService.generateTicketSuggestions(
    similarTickets, 
    currentTicket
);
```

## Configuration

Key configuration options:

```javascript
{
    suggestions: {
        maxSuggestions: 3,        // Always return exactly 3 suggestions
        minTickets: 1,            // Minimum similar tickets required
        maxTickets: 10            // Maximum similar tickets allowed
    },
    llm: {
        provider: 'gemini',
        temperature: 0.1,         // Low temperature for consistent responses
        maxTokens: 500
    }
}
```

## Features

### Core Features
- ✅ AI-powered suggestion generation
- ✅ Current ticket context support
- ✅ Pattern analysis from similar tickets
- ✅ Robust error handling
- ✅ Health checking
- ✅ Input validation

### Advanced Features
- ✅ Batch processing
- ✅ Custom suggestion parameters
- ✅ Fallback suggestions
- ✅ Processing time tracking
- ✅ Comprehensive logging

## Dependencies

- **Shared Components**: Uses shared utilities from `../shared`
- **LLM Provider**: Gemini for AI processing
- **Validation**: Express-validator for input validation
- **Response Formatting**: Shared response utilities

## Error Handling

The module includes comprehensive error handling:

- **Validation Errors**: Input validation with detailed error messages
- **LLM Errors**: Graceful handling of AI service failures
- **Fallback Suggestions**: Default suggestions when AI processing fails
- **Health Checks**: Service availability monitoring

## Testing

The module can be tested through:

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: API endpoint testing
3. **Health Checks**: Service availability testing

## Migration from ticket-similarity

The suggestion functionality has been moved from the ticket-similarity module to this dedicated module for better separation of concerns:

- **Before**: Suggestions were part of ticket-similarity
- **After**: Dedicated ticket-suggestion module
- **Benefits**: Better maintainability, clearer separation, focused functionality

## Future Enhancements

Potential future improvements:

- **Multiple LLM Support**: Support for different AI providers
- **Suggestion Templates**: Predefined suggestion templates
- **Learning System**: Improve suggestions based on feedback
- **Caching**: Cache suggestions for similar patterns
- **Analytics**: Track suggestion effectiveness
