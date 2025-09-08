const Anthropic = require('@anthropic-ai/sdk');

class AnthropicService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
  }

  async initialize() {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      
      this.client = new Anthropic({ apiKey });
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Anthropic service:', error.message);
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
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      return { 
        success: true, 
        message: 'Anthropic connection successful',
        response: response.content[0]?.text || 'No response'
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

      const response = await this.client.messages.create({
        model: options.model || 'claude-3-haiku-20240307',
        max_tokens: options.maxTokens || 150,
        messages: [{ role: 'user', content: prompt }]
      });

      return {
        success: true,
        response: response.content[0]?.text,
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

module.exports = { AnthropicService };