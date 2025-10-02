const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
  }

  async initialize() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }
      
      this.client = new GoogleGenerativeAI(apiKey);
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error.message);
      return false;
    }
  }

  async testConnection() {
    try {
      if (!this.isConfigured) {
        await this.initialize();
      }
      
      if (!this.client) {
        return { success: false, error: 'Service not initialized' };
      }

      // Test with a simple embedding request
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent('test');

      return { 
        success: true, 
        message: 'Gemini connection successful',
        embeddingDimension: result.embedding.values.length
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async generateEmbedding(text) {
    try {
      if (!this.isConfigured) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Service not initialized');
      }

      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);

      return {
        success: true,
        embedding: result.embedding.values,
        dimension: result.embedding.values.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateResponse(prompt, options = {}) {
    try {
      if (!this.isConfigured) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Service not initialized');
      }

      const model = this.client.getGenerativeModel({ 
        model: options.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash' 
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      return {
        success: true,
        response: response.text(),
        usage: response.usageMetadata || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateFastResponse(prompt) {
    try {
      if (!this.isConfigured) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Service not initialized');
      }

      // Use the fastest model for quick responses
      const model = this.client.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' 
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      return {
        success: true,
        response: response.text(),
        usage: response.usageMetadata || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateAdaptiveResponse(prompt, history = []) {
    try {
      if (!this.isConfigured) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Service not initialized');
      }

      // Build context from conversation history
      let contextPrompt = prompt;
      if (history && history.length > 0) {
        const contextMessages = history.slice(-5).map(msg => 
          `${msg.role}: ${msg.content}`
        ).join('\n');
        contextPrompt = `Previous conversation:\n${contextMessages}\n\nCurrent message: ${prompt}`;
      }

      // Use the more capable model for complex conversations
      const model = this.client.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' 
      });

      const result = await model.generateContent(contextPrompt);
      const response = result.response;

      return {
        success: true,
        response: response.text(),
        usage: response.usageMetadata || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { GeminiService };
