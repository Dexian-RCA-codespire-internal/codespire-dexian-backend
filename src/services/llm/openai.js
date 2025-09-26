const { OpenAI } = require('openai');

class OpenAIService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
  }

  async initialize() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      
      this.client = new OpenAI({ apiKey });
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI service:', error.message);
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

      // Simple test with a basic prompt
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });

      return { 
        success: true, 
        message: 'OpenAI connection successful',
        response: response.choices[0]?.message?.content || 'No response'
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

      // Build messages array with conversation history
      const messages = [];
      
      // Add conversation history if provided
      if (options.history && options.history.length > 0) {
        options.history.forEach(msg => {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          });
        });
      }
      
      // Add current message
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature || 0.7
      });

      return {
        success: true,
        response: response.choices[0]?.message?.content,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { OpenAIService };