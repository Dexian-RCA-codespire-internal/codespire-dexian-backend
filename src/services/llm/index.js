class LLMManager {
  constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  initializeServices() {
    // Lazy load services to avoid constructor issues
    this.services.set('openai', null);
    this.services.set('anthropic', null);
    this.services.set('ollama', null);
    this.services.set('gemini', null);
  }

  getService(serviceName) {
    if (!this.services.has(serviceName)) {
      throw new Error(`LLM service '${serviceName}' not found`);
    }
    
    if (this.services.get(serviceName) === null) {
      // Lazy load the service
      switch (serviceName) {
        case 'openai':
          const { OpenAIService } = require('./openai');
          this.services.set('openai', new OpenAIService());
          break;
        case 'anthropic':
          const { AnthropicService } = require('./anthropic');
          this.services.set('anthropic', new AnthropicService());
          break;
        case 'ollama':
          const { OllamaService } = require('./ollama');
          this.services.set('ollama', new OllamaService());
          break;
        case 'gemini':
          const { GeminiService } = require('./gemini');
          this.services.set('gemini', new GeminiService());
          break;
      }
    }
    
    return this.services.get(serviceName);
  }

  async testConnection(serviceName) {
    const service = this.getService(serviceName);
    return await service.testConnection();
  }

  async generateResponse(serviceName, prompt, options = {}) {
    const service = this.getService(serviceName);
    return await service.generateResponse(prompt, options);
  }

  getAvailableServices() {
    return Array.from(this.services.keys());
  }
}

module.exports = { LLMManager };
