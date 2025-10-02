# Agent Development Guide

## How to Create New AI Agents with Automatic Langfuse Tracking

This guide will help you create new AI agents that automatically get tracked by Langfuse for observability and monitoring.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Agent Architecture](#agent-architecture)
3. [Quick Start](#quick-start)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Langfuse Integration](#langfuse-integration)
6. [Best Practices](#best-practices)
7. [Testing Your Agent](#testing-your-agent)
8. [Examples](#examples)

---

## 🎯 Overview

Our agent system follows a standardized architecture that automatically includes:
- ✅ **Langfuse tracking** for all LLM calls
- ✅ **Error handling** and logging
- ✅ **Configuration management**
- ✅ **Shared utilities** (LLM, embeddings, vector store)
- ✅ **Response formatting**
- ✅ **Input validation**

---

## 🏗️ Agent Architecture

Each agent follows this structure:

```
src/agents/your-agent-name/
├── config.js              # Agent configuration
├── your-agent-name-agent.js # Core AI agent logic
├── service.js             # Business logic layer
├── index.js               # Module entry point
└── README.md              # Agent documentation
```

### Architecture Layers:

1. **Agent Class** (`*-agent.js`) - Core AI logic with LLM interactions
2. **Service Layer** (`service.js`) - Business logic and orchestration
3. **Module Export** (`index.js`) - Clean API interface
4. **Configuration** (`config.js`) - Agent-specific settings

---

## 🚀 Quick Start

### 1. Create Agent Directory
```bash
mkdir src/agents/my-new-agent
cd src/agents/my-new-agent
```

### 2. Use the Agent Template

Create the following files using our templates below.

---

## 📚 Step-by-Step Guide

### Step 1: Create Configuration (`config.js`)

```javascript
/**
 * My New Agent Configuration
 */

const { config: defaultConfig } = require('../shared');

// Create agent configuration with automatic Langfuse tracking
const config = defaultConfig.createRAGAgentConfig('my-new-agent', {
    // LLM settings - automatically uses GEMINI_MODEL env var
    llm: {
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        temperature: 0.3, // Adjust based on your needs
        maxTokens: 1000   // Adjust based on expected response length
    },
    
    // Agent-specific settings
    myAgent: {
        maxResponseLength: 500,
        minResponseLength: 50,
        enableSpecialFeature: true
    },
    
    // Validation schema for input
    validation: {
        requiredFields: ['inputText'], // Define required input fields
        textLimits: {
            inputText: { min: 10, max: 2000 }
        }
    },
    
    // API endpoints (if needed)
    endpoints: {
        process: '/api/my-agent/process',
        health: '/api/my-agent/health'
    }
});

module.exports = config;
```

### Step 2: Create Agent Class (`my-new-agent-agent.js`)

```javascript
/**
 * My New Agent
 * Description of what your agent does
 */

const { providers, utils } = require('../shared');
const llmProvider = providers.llm;

class MyNewAgentAgent {
    constructor(config) {
        this.config = config;
        this.initialized = false;
        this.llm = null;
    }

    /**
     * Initialize the agent
     */
    async initialize() {
        try {
            if (this.initialized) {
                return { success: true, message: 'Agent already initialized' };
            }

            // Initialize LLM provider using shared module
            // This automatically includes Langfuse tracking!
            this.llm = llmProvider.createLLM('gemini', {
                model: this.config.llm.model,
                temperature: this.config.llm.temperature,
                maxOutputTokens: this.config.llm.maxTokens
            });
            
            this.initialized = true;
            console.log('✅ My New Agent initialized successfully');
            return { success: true, message: 'Agent initialized successfully' };
        } catch (error) {
            console.error('❌ Error initializing agent:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Main processing method
     * @param {Object} input - Input data
     * @returns {Object} - Processing result
     */
    async processInput(input) {
        try {
            // Initialize if needed
            if (!this.initialized) {
                await this.initialize();
            }

            // Validate input
            const validation = this.validateInput(input);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'Invalid input',
                    details: validation.errors
                };
            }

            // Create your prompt
            const prompt = this.createPrompt(input);

            // 🎯 AUTOMATIC LANGFUSE TRACKING HAPPENS HERE!
            // Just use llmProvider.generateText with proper options
            const response = await llmProvider.generateText(this.llm, prompt, {
                agentName: 'my-new-agent',        // Your agent name
                operation: 'processInput',         // Operation name
                metadata: {                        // Custom metadata
                    inputLength: input.inputText?.length || 0,
                    hasSpecialFeature: this.config.myAgent.enableSpecialFeature
                },
                tags: ['my-agent', 'processing'],  // Tags for filtering
                session: input.session             // User session if available
            });

            // Parse and validate response
            const result = this.parseResponse(response);
            
            return {
                success: true,
                data: result,
                metadata: {
                    processingTime: Date.now(),
                    agentVersion: '1.0.0'
                }
            };

        } catch (error) {
            console.error('❌ Error processing input:', error);
            return {
                success: false,
                error: 'Processing failed',
                details: error.message
            };
        }
    }

    /**
     * Create prompt for LLM
     */
    createPrompt(input) {
        return `You are an expert assistant. Please process the following input:

Input: ${input.inputText}

Please provide a helpful response that is between ${this.config.myAgent.minResponseLength} and ${this.config.myAgent.maxResponseLength} characters.

Response:`;
    }

    /**
     * Validate input data
     */
    validateInput(input) {
        const errors = [];
        
        // Check required fields
        if (!input.inputText) {
            errors.push('inputText is required');
        }
        
        // Check text length
        if (input.inputText && input.inputText.length < this.config.validation.textLimits.inputText.min) {
            errors.push(`inputText must be at least ${this.config.validation.textLimits.inputText.min} characters`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Parse LLM response
     */
    parseResponse(response) {
        // Add your response parsing logic here
        return {
            processedText: response.trim(),
            confidence: 85, // You can calculate confidence if needed
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get agent health status
     */
    async getHealth() {
        try {
            if (!this.initialized) {
                return { status: 'unhealthy', reason: 'Agent not initialized' };
            }
            
            // Test LLM with simple prompt
            await llmProvider.generateText(this.llm, 'Test prompt', {
                agentName: 'my-new-agent',
                operation: 'healthCheck'
            });
            
            return { status: 'healthy' };
        } catch (error) {
            return { status: 'unhealthy', reason: error.message };
        }
    }
}

module.exports = MyNewAgentAgent;
```

### Step 3: Create Service Layer (`service.js`)

```javascript
/**
 * My New Agent Service
 * Service layer for business logic
 */

require('dotenv').config();

const MyNewAgentAgent = require('./my-new-agent-agent');
const config = require('./config');

class MyNewAgentService {
    constructor() {
        this.agent = new MyNewAgentAgent(config);
    }

    /**
     * Process input through the agent
     */
    async processInput(input) {
        try {
            console.log('🚀 Starting processing with My New Agent...');
            console.log('📋 Input:', input.inputText?.substring(0, 100) + '...');

            const result = await this.agent.processInput(input);

            if (result.success) {
                console.log('✅ Processing completed successfully');
                console.log('📊 Result:', result.data.processedText?.substring(0, 100) + '...');
            } else {
                console.error('❌ Processing failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ Error in service:', error);
            return {
                success: false,
                error: 'Service error',
                details: error.message
            };
        }
    }

    /**
     * Get service health
     */
    async getHealth() {
        return await this.agent.getHealth();
    }

    /**
     * Get service capabilities
     */
    getCapabilities() {
        return {
            name: 'My New Agent Service',
            version: '1.0.0',
            description: 'Description of what your agent does',
            capabilities: [
                'Text processing',
                'Custom feature 1',
                'Custom feature 2'
            ],
            supportedInputs: ['inputText'],
            outputFormat: 'Processed text with metadata'
        };
    }
}

module.exports = MyNewAgentService;
```

### Step 4: Create Module Entry Point (`index.js`)

```javascript
/**
 * My New Agent Module
 * Main entry point
 */

const MyNewAgentService = require('./service');

// Create and export service instance
const myNewAgentService = new MyNewAgentService();

module.exports = {
    myNewAgentService,
    MyNewAgentService
};
```

### Step 5: Create Documentation (`README.md`)

```markdown
# My New Agent

Brief description of what your agent does.

## Features

- Feature 1
- Feature 2
- Automatic Langfuse tracking

## Usage

```javascript
const { myNewAgentService } = require('./src/agents/my-new-agent');

const result = await myNewAgentService.processInput({
    inputText: "Your input text here"
});
```

## Configuration

The agent uses environment variables:
- `GEMINI_MODEL` - Gemini model to use
- `GEMINI_API_KEY` - Your Gemini API key
- `LANGFUSE_*` - Langfuse configuration

## API

### processInput(input)
Process input text and return result.

**Parameters:**
- `input.inputText` (string) - Text to process

**Returns:**
- `success` (boolean) - Whether processing succeeded
- `data` (object) - Processing result
- `error` (string) - Error message if failed
```

---

## 🔍 Langfuse Integration

### Automatic Tracking

Your agent gets automatic Langfuse tracking when you use:

```javascript
const response = await llmProvider.generateText(this.llm, prompt, {
    agentName: 'your-agent-name',      // 📊 Agent identifier
    operation: 'your-operation',       // 📊 Operation name  
    metadata: {                        // 📊 Custom metadata
        inputLength: input.length,
        customField: 'value'
    },
    tags: ['tag1', 'tag2'],           // 📊 Tags for filtering
    session: {                         // 📊 User session
        userId: 'user123',
        sessionId: 'session456'
    }
});
```

### What Gets Tracked Automatically:

- ✅ **Traces** - Each agent operation
- ✅ **Generations** - LLM calls with input/output
- ✅ **Token Usage** - Input/output/total tokens
- ✅ **Latency** - Response times
- ✅ **Errors** - Failed operations
- ✅ **Metadata** - Custom data you provide
- ✅ **Tags** - For filtering and organization

### Environment Variables

Make sure these are set for Langfuse tracking:

```bash
# Langfuse Configuration
LANGFUSE_PUBLIC_KEY=pk_...
LANGFUSE_SECRET_KEY=sk_...
LANGFUSE_HOST=https://cloud.langfuse.com

# Gemini Configuration  
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.0-flash
```

---

## ✅ Best Practices

### 1. Use Descriptive Agent Names
```javascript
// ✅ Good
agentName: 'document-summarizer'
agentName: 'ticket-classifier'

// ❌ Bad
agentName: 'agent1'
agentName: 'test'
```

### 2. Include Meaningful Metadata
```javascript
// ✅ Good
metadata: {
    inputLength: text.length,
    documentType: 'ticket',
    priority: 'high',
    userRole: 'admin'
}

// ❌ Bad
metadata: {}
```

### 3. Use Consistent Operation Names
```javascript
// ✅ Good - Use consistent naming
operation: 'generateSummary'
operation: 'classifyTicket'
operation: 'extractEntities'

// ❌ Bad - Inconsistent naming
operation: 'doStuff'
operation: 'process_data'
```

### 4. Handle Errors Properly
```javascript
try {
    const response = await llmProvider.generateText(this.llm, prompt, options);
    // Process success case
} catch (error) {
    console.error('❌ Agent error:', error);
    // Return proper error response
    return {
        success: false,
        error: 'Processing failed',
        details: error.message
    };
}
```

### 5. Validate Input Data
```javascript
validateInput(input) {
    const errors = [];
    
    // Check required fields
    if (!input.requiredField) {
        errors.push('requiredField is required');
    }
    
    // Check data types
    if (typeof input.text !== 'string') {
        errors.push('text must be a string');
    }
    
    // Check constraints
    if (input.text.length > 5000) {
        errors.push('text too long (max 5000 characters)');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}
```

---

## 🧪 Testing Your Agent

### 1. Create Test File (`test-my-agent.js`)

```javascript
/**
 * Test My New Agent
 */

const { myNewAgentService } = require('./index');

async function testAgent() {
    console.log('🧪 Testing My New Agent...');
    
    try {
        // Test basic functionality
        const result = await myNewAgentService.processInput({
            inputText: "This is a test input for my new agent."
        });
        
        console.log('📊 Result:', result);
        
        // Test health check
        const health = await myNewAgentService.getHealth();
        console.log('🏥 Health:', health);
        
        // Test capabilities
        const capabilities = myNewAgentService.getCapabilities();
        console.log('🎯 Capabilities:', capabilities);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAgent();
```

### 2. Run Your Test

```bash
node src/agents/my-new-agent/test-my-agent.js
```

### 3. Check Langfuse Dashboard

1. Go to your Langfuse dashboard
2. Look for traces with your agent name
3. Verify metadata and tags are captured
4. Check token usage and latency

---

## 📖 Examples

### Example 1: Text Summarizer Agent

```javascript
// In createPrompt method
createPrompt(input) {
    return `Please summarize the following text in ${input.maxLength || 100} words:

Text: ${input.text}

Summary:`;
}

// In generateText call
const response = await llmProvider.generateText(this.llm, prompt, {
    agentName: 'text-summarizer',
    operation: 'summarizeText',
    metadata: {
        textLength: input.text.length,
        maxSummaryLength: input.maxLength || 100,
        language: input.language || 'en'
    },
    tags: ['summarization', input.language || 'en']
});
```

### Example 2: Sentiment Analysis Agent

```javascript
// In createPrompt method
createPrompt(input) {
    return `Analyze the sentiment of the following text. Return JSON with sentiment (positive/negative/neutral) and confidence (0-100):

Text: ${input.text}

Response:`;
}

// In generateText call
const response = await llmProvider.generateText(this.llm, prompt, {
    agentName: 'sentiment-analyzer',
    operation: 'analyzeSentiment',
    metadata: {
        textLength: input.text.length,
        domain: input.domain || 'general'
    },
    tags: ['sentiment-analysis', input.domain || 'general']
});
```

---

## 🎉 Conclusion

By following this guide, your new agent will automatically:

- ✅ **Track all LLM interactions** in Langfuse
- ✅ **Follow consistent architecture** patterns
- ✅ **Handle errors gracefully**
- ✅ **Provide proper logging**
- ✅ **Support health checks**
- ✅ **Include comprehensive metadata**

### Next Steps:

1. Create your agent following this template
2. Test thoroughly with sample data
3. Check Langfuse dashboard for proper tracking
4. Add your agent to the main application routing
5. Document any custom features

### Need Help?

- Check existing agents for reference examples
- Review the shared utilities in `src/agents/shared/`
- Test with small inputs first
- Monitor Langfuse for tracking issues

Happy coding! 🚀
