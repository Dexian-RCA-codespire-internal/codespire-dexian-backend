# Vector Database Testing Guide

This guide provides comprehensive testing endpoints and scripts to verify that data is being saved to both MongoDB and the vector database (Qdrant) with embeddings.

## 🚀 Quick Start Testing

### Option 1: Run Automated Test Script
```bash
# Node.js test script (recommended)
node src/tests/testVectorIntegration.js

# Bash script (Linux/Mac)
chmod +x test-vector-endpoints.sh
./test-vector-endpoints.sh

# Windows batch file
test-vector-endpoints.bat
```

### Option 2: Manual Testing with cURL

## 📋 Testing Endpoints

### 1. Health Check
**Endpoint:** `GET /api/v1/playbooks/vectorization/health`
```bash
curl "http://localhost:3000/api/v1/playbooks/vectorization/health"
```

**Expected Response:**
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

### 2. Create Test Playbook
**Endpoint:** `POST /api/v1/playbooks`
```bash
curl -X POST "http://localhost:3000/api/v1/playbooks" \
  -H "Content-Type: application/json" \
  -d '{
    "playbook_id": "TEST_VECTOR_001",
    "title": "Network Troubleshooting Guide",
    "description": "Comprehensive guide to troubleshoot network connectivity issues including DNS problems, firewall configurations, and routing issues.",
    "priority": "High",
    "tags": ["network", "troubleshooting", "DNS", "firewall"],
    "steps": [
      {
        "step_id": 1,
        "title": "Check Network Connectivity",
        "action": "Test basic network connectivity using ping and traceroute commands",
        "expected_outcome": "Network connectivity is established"
      },
      {
        "step_id": 2,
        "title": "Verify DNS Resolution",
        "action": "Test DNS resolution using nslookup and dig commands",
        "expected_outcome": "DNS queries resolve correctly"
      },
      {
        "step_id": 3,
        "title": "Check Firewall Rules",
        "action": "Review and update firewall rules to allow necessary traffic",
        "expected_outcome": "Firewall allows required network traffic"
      }
    ],
    "outcome": "Network connectivity issues are resolved and system is stable",
    "created_by": "test_user"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "playbook_id": "TEST_VECTOR_001",
    "title": "Network Troubleshooting Guide",
    "description": "Comprehensive guide to troubleshoot network connectivity issues...",
    "priority": "High",
    "tags": ["network", "troubleshooting", "DNS", "firewall"],
    "steps": [...],
    "outcome": "Network connectivity issues are resolved and system is stable",
    "created_by": "test_user",
    "is_active": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Playbook created successfully"
}
```

### 3. Verify MongoDB Storage
**Endpoint:** `GET /api/v1/playbooks`
```bash
curl "http://localhost:3000/api/v1/playbooks"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "playbook_id": "TEST_VECTOR_001",
      "title": "Network Troubleshooting Guide",
      "description": "Comprehensive guide to troubleshoot network connectivity issues...",
      "priority": "High",
      "tags": ["network", "troubleshooting", "DNS", "firewall"],
      "steps": [...],
      "outcome": "Network connectivity issues are resolved and system is stable",
      "created_by": "test_user",
      "is_active": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### 4. Verify Qdrant Vector Storage
**Endpoint:** `GET http://localhost:6333/collections/playbooks`
```bash
curl "http://localhost:6333/collections/playbooks"
```

**Expected Response:**
```json
{
  "result": {
    "status": "green",
    "optimizer_status": "ok",
    "vectors_count": 1,
    "indexed_vectors_count": 1,
    "points_count": 1,
    "segments_count": 1,
    "config": {
      "params": {
        "vectors": {
          "size": 768,
          "distance": "Cosine"
        }
      },
      "hnsw_config": {
        "m": 16,
        "ef_construct": 100,
        "full_scan_threshold": 10000
      }
    }
  },
  "status": "ok",
  "time": 0.000123
}
```

### 5. Test Vector Similarity Search
**Endpoint:** `GET /api/v1/playbooks/search/vector`
```bash
curl "http://localhost:3000/api/v1/playbooks/search/vector?query=network%20troubleshooting&topK=5&minScore=0.5"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "playbook_id": "TEST_VECTOR_001",
      "title": "Network Troubleshooting Guide",
      "description": "Comprehensive guide to troubleshoot network connectivity issues...",
      "priority": "High",
      "tags": ["network", "troubleshooting", "DNS", "firewall"],
      "outcome": "Network connectivity issues are resolved and system is stable",
      "similarity_score": 0.95,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "query": "network troubleshooting",
  "search_type": "vector_similarity"
}
```

### 6. Test Hybrid Search
**Endpoint:** `GET /api/v1/playbooks/search/hybrid`
```bash
curl "http://localhost:3000/api/v1/playbooks/search/hybrid?query=network%20issues&vectorWeight=0.7&textWeight=0.3&maxResults=5"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "playbook_id": "TEST_VECTOR_001",
      "title": "Network Troubleshooting Guide",
      "description": "Comprehensive guide to troubleshoot network connectivity issues...",
      "priority": "High",
      "tags": ["network", "troubleshooting", "DNS", "firewall"],
      "outcome": "Network connectivity issues are resolved and system is stable",
      "combined_score": 0.89,
      "search_type": "hybrid",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "query": "network issues",
  "search_type": "hybrid",
  "weights": {
    "vector": 0.7,
    "text": 0.3
  }
}
```

### 7. Direct Qdrant Vector Search
**Endpoint:** `POST http://localhost:6333/collections/playbooks/points/search`
```bash
curl -X POST "http://localhost:6333/collections/playbooks/points/search" \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.3, ...],
    "limit": 5,
    "with_payload": true,
    "with_vector": false
  }'
```

## 🔍 Verification Checklist

### ✅ MongoDB Verification
- [ ] Playbook is saved in MongoDB
- [ ] All fields are correctly stored
- [ ] Timestamps are set
- [ ] Unique playbook_id is maintained

### ✅ Vector Database Verification
- [ ] Qdrant collection 'playbooks' exists
- [ ] Vector is stored with correct dimensions (768)
- [ ] Payload contains playbook metadata
- [ ] Vector search returns relevant results

### ✅ Embedding Verification
- [ ] Text is properly processed and combined
- [ ] Embedding is generated using Gemini
- [ ] Vector dimensions match configuration (768)
- [ ] Similarity scores are reasonable (0.5-1.0)

## 🧪 Test Scenarios

### Scenario 1: Basic CRUD Operations
1. Create playbook → Verify MongoDB + Vector storage
2. Update playbook → Verify both databases updated
3. Delete playbook → Verify both databases cleaned

### Scenario 2: Search Functionality
1. Create multiple playbooks with different topics
2. Test vector search with various queries
3. Test hybrid search with different weights
4. Verify search results are relevant and ranked

### Scenario 3: Error Handling
1. Test with invalid data
2. Test with missing required fields
3. Test with Qdrant service down
4. Verify graceful degradation

## 🐛 Troubleshooting

### Common Issues

1. **Vector Search Returns No Results**
   - Check if playbooks collection exists in Qdrant
   - Verify embedding generation is working
   - Check minimum score threshold

2. **Embedding Generation Fails**
   - Verify GEMINI_API_KEY is set
   - Check network connectivity to Gemini API
   - Review embedding provider configuration

3. **Qdrant Connection Issues**
   - Verify Qdrant is running on port 6333
   - Check QDRANT_URL configuration
   - Review Qdrant logs for errors

### Debug Commands
```bash
# Check Qdrant status
curl http://localhost:6333/collections

# Check application logs
docker-compose logs app

# Check Qdrant logs
docker-compose logs qdrant

# Test embedding generation
curl -X POST "http://localhost:3000/api/v1/playbooks" \
  -H "Content-Type: application/json" \
  -d '{"playbook_id": "DEBUG_001", "title": "Test", "description": "Test description", "priority": "Low", "steps": [{"step_id": 1, "title": "Test", "action": "Test", "expected_outcome": "Test"}], "outcome": "Test"}'
```

## 📊 Performance Testing

### Load Testing
```bash
# Create multiple playbooks
for i in {1..10}; do
  curl -X POST "http://localhost:3000/api/v1/playbooks" \
    -H "Content-Type: application/json" \
    -d "{\"playbook_id\": \"LOAD_TEST_$i\", \"title\": \"Load Test $i\", \"description\": \"Load testing playbook $i\", \"priority\": \"Medium\", \"steps\": [{\"step_id\": 1, \"title\": \"Step $i\", \"action\": \"Action $i\", \"expected_outcome\": \"Outcome $i\"}], \"outcome\": \"Outcome $i\"}"
done

# Test search performance
time curl "http://localhost:3000/api/v1/playbooks/search/vector?query=load%20test&topK=10"
```

## 🎯 Success Criteria

- ✅ Playbooks are saved to both MongoDB and Qdrant
- ✅ Vector embeddings are generated correctly
- ✅ Vector search returns relevant results
- ✅ Hybrid search combines text and vector results
- ✅ Error handling works gracefully
- ✅ Performance is acceptable (< 2 seconds for search)

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

MongoDB Storage: ✅/❌
Vector Storage: ✅/❌
Embedding Generation: ✅/❌
Vector Search: ✅/❌
Hybrid Search: ✅/❌
Error Handling: ✅/❌
Performance: ✅/❌

Notes:
- 
- 
- 

Overall Result: ✅ PASS / ❌ FAIL
```
