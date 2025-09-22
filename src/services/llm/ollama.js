const axios = require('axios');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.isConfigured = true; // Ollama is typically local
  }

  async testConnection() {
    try {
      // Test if Ollama is running
      const response = await axios.get(`${this.baseURL}/api/tags`);
      
      if (response.status === 200) {
        return { 
          success: true, 
          message: 'Ollama connection successful',
          models: response.data.models || []
        };
      } else {
        return { 
          success: false, 
          error: 'Ollama service not responding' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Ollama service not accessible. Make sure it's running on ${this.baseURL}` 
      };
    }
  }

  async generateResponse(prompt, options = {}) {
    try {
      const model = options.model || 'llama2';
      
      // Build context from conversation history if provided
      let contextPrompt = prompt;
      if (options.history && options.history.length > 0) {
        const contextMessages = options.history.map(msg => 
          `${msg.role}: ${msg.content}`
        ).join('\n');
        contextPrompt = `Previous conversation:\n${contextMessages}\n\nCurrent message: ${prompt}`;
      }
      
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: model,
        prompt: contextPrompt,
        stream: false
      });

      if (response.data && response.data.response) {
        return {
          success: true,
          response: response.data.response,
          model: model
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from Ollama'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { OllamaService };