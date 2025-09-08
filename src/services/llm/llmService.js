const { OpenAIService } = require('./openai');
const { AnthropicService } = require('./anthropic');
const { OllamaService } = require('./ollama');

class LLMService {
  constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  initializeServices() {
    this.services.set('openai', new OpenAIService());
    this.services.set('anthropic', new AnthropicService());
    this.services.set('ollama', new OllamaService());
  }

  async testConnection(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`LLM service '${serviceName}' not found`);
    }
    return await service.testConnection();
  }

  async generateResponse(serviceName, prompt, options = {}) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`LLM service '${serviceName}' not found`);
    }
    return await service.generateResponse(prompt, options);
  }

  getAvailableServices() {
    return Array.from(this.services.keys());
  }
}

module.exports = { LLMService };
