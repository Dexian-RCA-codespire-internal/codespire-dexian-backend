const { LLMManager } = require('../services/llm');

class LLMController {
  constructor() {
    this.llmManager = new LLMManager();
  }

  async generateResponse(req, res) {
    try {
      const { service, prompt, options } = req.body;
      
      if (!service || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'Service and prompt are required'
        });
      }

      const result = await this.llmManager.generateResponse(service, prompt, options);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getAvailableServices(req, res) {
    try {
      const services = this.llmManager.getAvailableServices();
      res.json({
        success: true,
        services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = { LLMController };
