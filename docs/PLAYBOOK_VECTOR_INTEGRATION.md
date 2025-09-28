# Playbook Vector Integration Documentation

## Overview

This document describes the implementation of vector storage and search functionality for playbooks, enabling semantic search capabilities using embeddings and the Qdrant vector database.

## Architecture

The implementation follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend/API Layer                      │
├─────────────────────────────────────────────────────────────┤
│                 Playbook Controller                         │
│  - createPlaybook()                                        │
│  - updatePlaybook()                                        │
│  - deletePlaybook()                                        │
│  - searchPlaybooksByVector()                               │
│  - hybridSearchPlaybooks()                                 │
├─────────────────────────────────────────────────────────────┤
│                  Playbook Service                           │
│  - MongoDB operations                                      │
│  - Vector storage integration                              │
│  - Hybrid search logic                                     │
├─────────────────────────────────────────────────────────────┤
│              Playbook Vectorization Service                 │
│  - Embedding generation                                    │
│  - Vector storage operations                               │
│  - Similarity search                                       │
├─────────────────────────────────────────────────────────────┤
│                Shared Agent Components                      │
│  - Embedding Provider (Gemini)                             │
│  - Qdrant Vector Store Utils                               │
│  - Configuration Management                                │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                              │
│  - MongoDB (Playbook documents)                            │
│  - Qdrant (Vector embeddings)                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Playbook Vectorization Service (`playbookVectorizationService.js`)

**Purpose**: Handles all vector-related operations for playbooks.

**Key Features**:
- **Initialization**: Sets up embedding provider and Qdrant collection
- **Text Preparation**: Combines playbook fields with weighted importance
- **Vector Storage**: Stores playbook embeddings in Qdrant
- **Similarity Search**: Performs vector-based similarity searches
- **Health Monitoring**: Provides service health status

**Configuration**:
```javascript
{
  vectorDb: {
    collectionName: 'playbooks',
    vectorSize: 768, // Gemini default
    distance: 'Cosine',
    topK: 20
  },
  textProcessing: {
    fieldWeights: {
      title: 0.3,
      description: 0.4,
      steps: 0.2,
      tags: 0.1
    }
  }
}
```

### 2. Enhanced Playbook Service (`playbookService.js`)

**New Features**:
- **Simultaneous Storage**: Saves to both MongoDB and vector database
- **Vector Search**: `searchPlaybooksByVector()` method
- **Hybrid Search**: `hybridSearchPlaybooks()` combining text and vector search
- **Health Monitoring**: `getVectorizationHealth()` method

**Error Handling**: Vector operations are wrapped in try-catch blocks to ensure MongoDB operations succeed even if vector operations fail.

### 3. Updated Playbook Controller (`playbookController.js`)

**New Endpoints**:
- `GET /api/v1/playbooks/search/vector` - Vector similarity search
- `GET /api/v1/playbooks/search/hybrid` - Hybrid search
- `GET /api/v1/playbooks/vectorization/health` - Service health check

### 4. Updated Routes (`playbooks.js`)

Added new route definitions for vector search endpoints with proper Swagger documentation.

## API Endpoints

### Vector Search
```http
GET /api/v1/playbooks/search/vector?query=network issue&topK=10&minScore=0.7
```

**Parameters**:
- `query` (required): Search query string
- `topK` (optional): Number of results (default: 20)
- `minScore` (optional): Minimum similarity score (default: 0.7)
- `priority` (optional): Filter by priority level
- `tags` (optional): Comma-separated tags to filter by

### Hybrid Search
```http
GET /api/v1/playbooks/search/hybrid?query=network issue&vectorWeight=0.7&textWeight=0.3
```

**Parameters**:
- `query` (required): Search query string
- `vectorWeight` (optional): Weight for vector similarity (default: 0.7)
- `textWeight` (optional): Weight for text search (default: 0.3)
- `maxResults` (optional): Maximum results (default: 10)
- `priority` (optional): Filter by priority level
- `tags` (optional): Comma-separated tags to filter by

### Health Check
```http
GET /api/v1/playbooks/vectorization/health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "qdrant": true,
    "embeddings": true,
    "initialized": true,
    "collection_name": "playbooks",
    "config": {
      "provider": "gemini",
      "vector_size": 768,
      "distance": "Cosine"
    }
  }
}
```

## Data Flow

### Creating a Playbook
1. **Validation**: Validate playbook data
2. **MongoDB Save**: Save playbook to MongoDB
3. **Text Preparation**: Combine playbook fields with weights
4. **Embedding Generation**: Generate vector embedding using Gemini
5. **Vector Storage**: Store embedding in Qdrant with metadata
6. **Response**: Return success with playbook data

### Updating a Playbook
1. **MongoDB Update**: Update playbook in MongoDB
2. **Vector Update**: Update vector in Qdrant (upsert operation)
3. **Response**: Return updated playbook data

### Deleting a Playbook
1. **MongoDB Soft Delete**: Set `is_active: false` in MongoDB
2. **Vector Delete**: Remove vector from Qdrant
3. **Response**: Return success message

### Vector Search
1. **Query Embedding**: Generate embedding for search query
2. **Qdrant Search**: Search similar vectors in Qdrant
3. **Filtering**: Apply filters (priority, tags, etc.)
4. **Scoring**: Filter by minimum similarity score
5. **Response**: Return ranked results with similarity scores

### Hybrid Search
1. **Parallel Search**: Run vector and text search simultaneously
2. **Score Combination**: Combine scores with configurable weights
3. **Deduplication**: Merge results from both searches
4. **Ranking**: Sort by combined scores
5. **Response**: Return ranked results with search type indicators

## Configuration

### Environment Variables
```bash
# Required for Gemini embeddings
GEMINI_API_KEY=your_gemini_api_key

# Qdrant configuration (from existing setup)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
```

### Embedding Provider Configuration
The system uses the shared embedding provider configuration from `src/agents/shared/providers/embedding-provider.js`:

- **Provider**: Gemini (text-embedding-004)
- **Dimension**: 768
- **Distance Metric**: Cosine similarity

## Error Handling

### Graceful Degradation
- MongoDB operations always succeed even if vector operations fail
- Vector search failures fall back to text search
- Health checks provide detailed status information

### Error Logging
- All vector operations are logged with appropriate levels
- Warnings are logged for non-critical failures
- Errors are logged with full context for debugging

## Testing

### Test File
A comprehensive test file is provided at `src/tests/playbookVectorization.test.js` that covers:

1. Service initialization
2. Playbook creation with vector storage
3. Vector similarity search
4. Hybrid search functionality
5. Health status monitoring
6. Data cleanup

### Running Tests
```bash
# Run the vectorization tests
node src/tests/playbookVectorization.test.js
```

## Performance Considerations

### Optimization Features
- **Parallel Processing**: Hybrid search runs vector and text search in parallel
- **Configurable Limits**: TopK and maxResults parameters for result limiting
- **Efficient Filtering**: Qdrant filters applied at database level
- **Caching**: Embedding provider instances are reused

### Scalability
- **Collection Management**: Automatic collection creation and management
- **Batch Operations**: Support for bulk vector operations
- **Indexing**: Proper indexing in both MongoDB and Qdrant

## Monitoring and Maintenance

### Health Monitoring
- **Service Health**: Check vectorization service status
- **Database Health**: Monitor Qdrant and MongoDB connectivity
- **Configuration Status**: Verify embedding provider configuration

### Maintenance Tasks
- **Collection Cleanup**: Remove inactive playbook vectors
- **Performance Monitoring**: Track search performance metrics
- **Error Monitoring**: Monitor vector operation failures

## Future Enhancements

### Potential Improvements
1. **Multiple Embedding Providers**: Support for OpenAI, Cohere, etc.
2. **Advanced Filtering**: More sophisticated filter combinations
3. **Caching Layer**: Redis cache for frequently searched queries
4. **Analytics**: Search analytics and usage tracking
5. **A/B Testing**: Compare different embedding models
6. **Real-time Updates**: WebSocket updates for vector changes

### Integration Opportunities
1. **Ticket Similarity**: Use playbook vectors for ticket matching
2. **Recommendation Engine**: Suggest relevant playbooks
3. **Content Generation**: Use vectors for AI-powered content creation
4. **Knowledge Base**: Expand to other content types

## Troubleshooting

### Common Issues

1. **Vector Storage Fails**
   - Check Qdrant connectivity
   - Verify embedding provider configuration
   - Check API key validity

2. **Search Returns No Results**
   - Verify collection exists
   - Check minimum score threshold
   - Ensure playbooks are active

3. **Performance Issues**
   - Reduce topK parameter
   - Optimize filter conditions
   - Check database performance

### Debug Commands
```bash
# Check vectorization health
curl http://localhost:3000/api/v1/playbooks/vectorization/health

# Test vector search
curl "http://localhost:3000/api/v1/playbooks/search/vector?query=test&topK=5"

# Check Qdrant collections
curl http://localhost:6333/collections
```

## Conclusion

The playbook vector integration provides powerful semantic search capabilities while maintaining backward compatibility with existing text-based search. The implementation follows best practices for error handling, performance optimization, and maintainability.

The system is designed to be extensible and can easily accommodate future enhancements such as additional embedding providers, advanced filtering, and integration with other system components.
