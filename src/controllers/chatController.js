// new file servicenow
const { LLMManager } = require('../services/llm');

class ChatController {
  constructor() {
    this.llmManager = new LLMManager();
    this.conversationHistory = new Map(); // Store conversation history per user/session
  }

  // Send message endpoint
  async sendMessage(req, res) {
    try {
      const { message, sessionId = 'default', service = 'gemini' } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
      }

      // Get conversation history for this session
      const history = this.conversationHistory.get(sessionId) || [];
      
      // Generate response using the specified service
      let response;
      if (service === 'gemini') {
        const geminiService = this.llmManager.getService('gemini');
        // Use fast response for better performance
        if (message.length < 100 && history.length < 3) {
          response = await geminiService.generateFastResponse(message);
        } else {
          response = await geminiService.generateAdaptiveResponse(message, history);
        }
      } else {
        response = await this.llmManager.generateResponse(service, message, {
          context: history.length > 0 ? history.slice(-3).map(msg => 
            `${msg.role}: ${msg.content}`
          ).join('\n') : null
        });
      }

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Failed to generate response'
        });
      }

      // Update conversation history
      const newHistory = [
        ...history,
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response.response, timestamp: new Date() }
      ];
      
      // Keep only last 10 messages to prevent memory issues
      this.conversationHistory.set(sessionId, newHistory.slice(-10));

      res.json({
        success: true,
        response: response.response,
        sessionId,
        service,
        usage: response.usage || null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Chat controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get conversation history
  async getHistory(req, res) {
    try {
      const { sessionId = 'default' } = req.query;
      const history = this.conversationHistory.get(sessionId) || [];

      res.json({
        success: true,
        history,
        sessionId,
        count: history.length
      });

    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation history'
      });
    }
  }

  // Clear conversation history
  async clearHistory(req, res) {
    try {
      const { sessionId = 'default' } = req.body;
      
      if (sessionId === 'all') {
        this.conversationHistory.clear();
      } else {
        this.conversationHistory.delete(sessionId);
      }

      res.json({
        success: true,
        message: `Conversation history cleared for session: ${sessionId}`,
        sessionId
      });

    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear conversation history'
      });
    }
  }

  // Test LLM service connection
  async testService(req, res) {
    try {
      const { service = 'gemini' } = req.query;
      
      const result = await this.llmManager.testConnection(service);
      
      res.json({
        success: result.success,
        service,
        message: result.message,
        response: result.response || null,
        error: result.error || null
      });

    } catch (error) {
      console.error('Test service error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test service connection',
        message: error.message
      });
    }
  }

  // Get available services
  async getAvailableServices(req, res) {
    try {
      const services = this.llmManager.getAvailableServices();
      
      res.json({
        success: true,
        services,
        count: services.length
      });

    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available services'
      });
    }
  }

  // Generate response with specific options
  async generateResponse(req, res) {
    try {
      const { 
        message, 
        service = 'gemini', 
        options = {} 
      } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
      }

      const response = await this.llmManager.generateResponse(service, message, options);

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Failed to generate response'
        });
      }

      res.json({
        success: true,
        response: response.response,
        service,
        usage: response.usage || null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Generate response error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get welcome message
  async getWelcomeMessage(req, res) {
    try {
      const welcomeMessage = `Hello! I'm your RCA (Root Cause Analysis) AI assistant. 
I help with IT incident management, troubleshooting, and root cause analysis. 
How can I assist you with your incident investigation today?`;

      res.json({
        success: true,
        response: welcomeMessage,
        service: 'system',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Welcome message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get welcome message'
      });
    }
  }
}

module.exports = new ChatController();
