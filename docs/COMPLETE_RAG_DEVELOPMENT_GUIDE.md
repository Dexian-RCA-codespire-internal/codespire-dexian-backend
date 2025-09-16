# Simple JSON Chatbot Guide

A comprehensive guide for creating new RAG (Retrieval-Augmented Generation) agents using our shared infrastructure.

## 🎯 What We're Building

1. Upload 50 JSON records to vector database
2. Ask questions about the data
3. Get intelligent responses from LLM


### Shared Components Structure
```
src/agents/
├── shared/
│   ├── index.js                    # Main export with organized structure
│   ├── providers/
│   │   ├── llm-provider.js         # LLM management
│   │   └── embedding-provider.js   # Embedding management
│   ├── vector-store/
│   │   └── qdrant-utils.js         # Qdrant operations
│   ├── utils/
│   │   ├── validation.js           # Input validation
│   │   ├── text-processing.js      # Text processing
│   │   └── response-formatting.js  # Response formatting
│   └── config/
│       └── default-config.js       # Configuration templates
├── your-chatbot/                # Your new agent
│   ├── config.js                   # Agent configuration
│   ├── chatbot-agent.js             # Core search logic
│   └── index.js                    # Main export
└── ticket-similarity/              # Example agent
```

## 🚀 Step 1: Create Configuration (`config.js`)

```javascript
const { config } = require('../shared');

const agentConfig = config.createRAGAgentConfig('json-chatbot', {
    vectorDb: {
        collectionName: 'json_data',
        vectorSize: 768,
        topK: 5  // Get top 5 relevant records
    },
    
    response: {
        minConfidenceScore: 0.6,
        maxResults: 3
    },
    
    textProcessing: {
        fieldWeights: {
            title: 0.3,
            description: 0.4,
            content: 0.3
        }
    }
});

module.exports = agentConfig;
```

## 🚀 Step 2: Create Main Chatbot Logic (`chatbot-agent.js`)

```javascript
const { providers, vectorStore, utils } = require('../shared');

// Extract specific functions from organized modules
const { createEmbeddings } = providers.embedding;
const { createLLM } = providers.llm;
const { ensureCollection, searchSimilar, storeDocuments } = vectorStore.qdrant;
const { createWeightedText } = utils.textProcessing;
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;

const qdrantService = require('../../services/qdrantService');
const config = require('./config');

// Module state
let embeddings = null;
let llm = null;
let qdrantClient = null;
let initialized = false;

/**
 * Initialize the chatbot
 */
async function initialize() {
    if (initialized) return;
    
    console.log('🤖 Initializing JSON Chatbot...');
    
    // Create providers
    embeddings = createEmbeddings();
    llm = createLLM('gemini', { temperature: 0.7 }); // Higher temperature for conversational responses
    
    // Get Qdrant client
    qdrantClient = qdrantService.getClient();
    
    // Ensure collection exists
    await ensureCollection(
        qdrantClient,
        config.vectorDb.collectionName,
        config.vectorDb.vectorSize
    );
    
    initialized = true;
    console.log('✅ JSON Chatbot initialized');
}

/**
 * Upload JSON data to vector database
 */
async function uploadJSONData(jsonArray) {
    try {
        if (!initialized) await initialize();
        
        console.log(`📄 Uploading ${jsonArray.length} JSON records...`);
        
        const documents = [];
        
        for (let i = 0; i < jsonArray.length; i++) {
            const jsonRecord = jsonArray[i];
            
            // Create text representation of JSON for embedding
            const textContent = createTextFromJSON(jsonRecord);
            
            // Generate embedding
            const vector = await embeddings.embedQuery(textContent);
            
            documents.push({
                vector: vector,
                payload: {
                    id: jsonRecord.id || `record_${i}`,
                    original_data: jsonRecord,
                    text_content: textContent,
                    record_index: i
                }
            });
            
            if (i % 10 === 0) {
                console.log(`   Processed ${i + 1}/${jsonArray.length} records`);
            }
        }
        
        // Store in Qdrant
        const pointIds = await storeDocuments(
            qdrantClient,
            config.vectorDb.collectionName,
            documents
        );
        
        console.log(`✅ Successfully uploaded ${pointIds.length} JSON records`);
        
        return createSuccessResponse({
            records_uploaded: pointIds.length,
            point_ids: pointIds
        }, `Uploaded ${pointIds.length} JSON records successfully`);
        
    } catch (error) {
        console.error('❌ Error uploading JSON data:', error);
        return createErrorResponse('Failed to upload JSON data', error.message);
    }
}

/**
 * Ask a question about the JSON data
 */
async function askQuestion(question) {
    try {
        if (!initialized) await initialize();
        
        console.log(`💬 Question: "${question}"`);
        
        // Generate embedding for the question
        const questionVector = await embeddings.embedQuery(question);
        
        // Search for relevant JSON records
        const searchResults = await searchSimilar(
            qdrantClient,
            config.vectorDb.collectionName,
            questionVector,
            config.vectorDb.topK
        );
        
        // Filter by confidence
        const relevantRecords = searchResults
            .filter(result => result.score >= config.response.minConfidenceScore)
            .slice(0, config.response.maxResults);
        
        if (relevantRecords.length === 0) {
            return createSuccessResponse({
                answer: "I couldn't find relevant information in the uploaded data to answer your question. Could you try rephrasing or asking about something else?",
                confidence: 0,
                sources_found: 0
            });
        }
        
        // Create context from relevant records
        const context = createContextFromRecords(relevantRecords);
        
        // Generate response using LLM
        const prompt = createChatbotPrompt(question, context);
        const llmResponse = await llm.invoke(prompt);
        
        return createSuccessResponse({
            answer: llmResponse.content,
            confidence: calculateAverageConfidence(relevantRecords),
            sources_found: relevantRecords.length,
            relevant_records: relevantRecords.map(record => ({
                id: record.payload.id,
                confidence: Math.round(record.score * 100),
                data: record.payload.original_data
            }))
        });
        
    } catch (error) {
        console.error('❌ Error processing question:', error);
        return createErrorResponse('Failed to process question', error.message);
    }
}

/**
 * Convert JSON object to searchable text
 */
function createTextFromJSON(jsonObj) {
    const textParts = [];
    
    function extractText(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) continue;
            
            if (typeof value === 'object' && !Array.isArray(value)) {
                // Nested object
                extractText(value, `${prefix}${key}.`);
            } else if (Array.isArray(value)) {
                // Array
                textParts.push(`${prefix}${key}: ${value.join(', ')}`);
            } else {
                // Primitive value
                textParts.push(`${prefix}${key}: ${value}`);
            }
        }
    }
    
    extractText(jsonObj);
    return textParts.join(' | ');
}

/**
 * Create context from relevant records for LLM
 */
function createContextFromRecords(records) {
    return records.map((record, index) => {
        const data = record.payload.original_data;
        const formattedData = JSON.stringify(data, null, 2);
        return `Record ${index + 1} (Confidence: ${Math.round(record.score * 100)}%):\n${formattedData}`;
    }).join('\n\n---\n\n');
}

/**
 * Create prompt for the chatbot
 */
function createChatbotPrompt(question, context) {
    return `You are a helpful assistant that answers questions based on JSON data provided to you.

AVAILABLE DATA:
${context}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Answer the question using ONLY the information from the provided JSON data
2. Be specific and reference the actual data values when possible
3. If the data doesn't contain enough information to fully answer the question, say so clearly
4. Be conversational and helpful in your response
5. If multiple records are relevant, synthesize the information appropriately

ANSWER:`;
}

/**
 * Calculate average confidence from search results
 */
function calculateAverageConfidence(records) {
    if (records.length === 0) return 0;
    const avgScore = records.reduce((sum, record) => sum + record.score, 0) / records.length;
    return Math.round(avgScore * 100) / 100;
}

/**
 * Get chatbot status
 */
async function getStatus() {
    try {
        if (!initialized) {
            return createErrorResponse('Chatbot not initialized');
        }
        
        // Test basic functionality
        await embeddings.embedQuery('test');
        await qdrantClient.getCollections();
        
        return createSuccessResponse({
            status: 'ready',
            collection: config.vectorDb.collectionName,
            initialized: true
        });
        
    } catch (error) {
        return createErrorResponse('Chatbot status check failed', error.message);
    }
}

module.exports = {
    initialize,
    uploadJSONData,
    askQuestion,
    getStatus
};
```

## 🚀 Step 3: Create Entry Point (`index.js`)

```javascript
const chatbotAgent = require('./chatbot-agent');

module.exports = {
    // Main functions
    uploadData: chatbotAgent.uploadJSONData,
    askQuestion: chatbotAgent.askQuestion,
    getStatus: chatbotAgent.getStatus,
    
    // Initialize (call this first)
    initialize: chatbotAgent.initialize
};
```

## 🎯 Step 4: Usage Examples

### Initialize the Chatbot

```javascript
const jsonChatbot = require('./src/agents/json-chatbot');

// Initialize first
await jsonChatbot.initialize();
```

### Upload Your 50 JSON Records

```javascript
// Your JSON data
const myJsonData = [
    {
        "id": 1,
        "name": "John Doe",
        "role": "Software Engineer",
        "department": "Engineering",
        "skills": ["JavaScript", "Python", "React"],
        "experience": "5 years",
        "location": "New York"
    },
    {
        "id": 2,
        "name": "Jane Smith",
        "role": "Product Manager",
        "department": "Product",
        "skills": ["Product Strategy", "Analytics", "Agile"],
        "experience": "7 years",
        "location": "San Francisco"
    },
    // ... 48 more records
];

// Upload the data
const uploadResult = await jsonChatbot.uploadData(myJsonData);
console.log(uploadResult);
```

### Ask Questions

```javascript
// Ask questions about your data
const questions = [
    "Who are the software engineers in the data?",
    "What skills does John Doe have?",
    "How many people work in the Engineering department?",
    "Who has the most experience?",
    "What are the most common skills?"
];

for (const question of questions) {
    const response = await jsonChatbot.askQuestion(question);
    
    if (response.success) {
        console.log(`Q: ${question}`);
        console.log(`A: ${response.data.answer}`);
        console.log(`Confidence: ${response.data.confidence}`);
        console.log('---');
    }
}
```

## 🔧 Complete Working Example

```javascript
// complete-example.js
const jsonChatbot = require('./src/agents/json-chatbot');

async function runChatbotExample() {
    try {
        // 1. Initialize
        console.log('🤖 Initializing chatbot...');
        await jsonChatbot.initialize();
        
        // 2. Prepare sample data
        const sampleData = [
            {
                "id": 1,
                "product": "Laptop Pro",
                "category": "Electronics",
                "price": 1299,
                "rating": 4.5,
                "features": ["16GB RAM", "1TB SSD", "Intel i7"],
                "description": "High-performance laptop for professionals"
            },
            {
                "id": 2,
                "product": "Wireless Headphones",
                "category": "Audio",
                "price": 299,
                "rating": 4.8,
                "features": ["Noise Cancelling", "30hr Battery", "Bluetooth 5.0"],
                "description": "Premium wireless headphones with excellent sound quality"
            },
            {
                "id": 3,
                "product": "Smart Watch",
                "category": "Wearables",
                "price": 399,
                "rating": 4.3,
                "features": ["Health Tracking", "GPS", "Water Resistant"],
                "description": "Advanced smartwatch with comprehensive health monitoring"
            }
            // Add 47 more products...
        ];
        
        // 3. Upload data
        console.log('📤 Uploading JSON data...');
        const uploadResult = await jsonChatbot.uploadData(sampleData);
        console.log(uploadResult.message);
        
        // 4. Ask questions
        const questions = [
            "What's the most expensive product?",
            "Which products have the highest rating?",
            "What electronics are available?",
            "Tell me about products with Bluetooth features"
        ];
        
        console.log('\n💬 Starting Q&A session...\n');
        
        for (const question of questions) {
            console.log(`❓ Question: ${question}`);
            
            const response = await jsonChatbot.askQuestion(question);
            
            if (response.success) {
                console.log(`🤖 Answer: ${response.data.answer}`);
                console.log(`📊 Confidence: ${response.data.confidence}%`);
                console.log(`📋 Sources: ${response.data.sources_found} records\n`);
            } else {
                console.log(`❌ Error: ${response.message}\n`);
            }
        }
        
    } catch (error) {
        console.error('❌ Example failed:', error);
    }
}

// Run the example
runChatbotExample();
```

## 🎯 Key Features

✅ **Simple Setup** - Just 3 files
✅ **JSON Upload** - Upload any JSON structure
✅ **Smart Search** - Vector similarity search
✅ **LLM Responses** - Intelligent answers about your data
✅ **Confidence Scoring** - Know how reliable the answers are
✅ **Source References** - See which records were used

## 🔧 Customization

### Change Response Style

```javascript
// In chatbot-agent.js, modify the prompt:
function createChatbotPrompt(question, context) {
    return `You are a [YOUR PERSONA] that answers questions about [YOUR DATA TYPE].
    
    // Your custom instructions here
    
    ANSWER:`;
}
```

### Adjust Search Sensitivity

```javascript
// In config.js:
response: {
    minConfidenceScore: 0.5,  // Lower = more results
    maxResults: 5             // Higher = more context
}
```

## 🎯 That's It!

1. **Create 3 files** with the code above
2. **Upload your 50 JSON records** using `uploadData()`
3. **Ask questions** using `askQuestion()`
4. **Get intelligent responses** based on your data

Your JSON chatbot is ready! 🎉
