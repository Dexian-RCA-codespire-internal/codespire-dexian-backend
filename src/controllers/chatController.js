// new file servicenow
const { LLMManager } = require('../services/llm');

class ChatController {
  constructor() {
    this.llmManager = new LLMManager();
    this.conversationHistory = new Map(); // Store conversation history per user/session
  }

  // Send message endpoint - matches exact API specification
  async sendMessage(req, res) {
    try {
      const { message, sessionId, service, context } = req.body;

      // Get conversation history for this session
      const history = this.conversationHistory.get(sessionId) || [];
      
      // Prepare context for AI service
      const conversationContext = {
        history: history.slice(-10), // Keep last 10 messages for context
        additionalContext: context || {},
        sessionId
      };
      
      // Generate response using the specified service
      const response = await this.llmManager.generateResponse(service, message, conversationContext);

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Failed to generate response'
        });
      }

      // Update conversation history
      const newHistory = [
        ...history,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: response.response, timestamp: new Date().toISOString() }
      ];
      
      // Keep only last 20 messages to prevent memory issues
      this.conversationHistory.set(sessionId, newHistory.slice(-20));

      // Return response matching exact API specification
      res.json({
        response: response.response,
        timestamp: new Date().toISOString(),
        service: service,
        usage: response.usage || null
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

  // Get conversation history - matches exact API specification
  async getHistory(req, res) {
    try {
      const { sessionId = 'default' } = req.query;
      const history = this.conversationHistory.get(sessionId) || [];

      // Return response matching exact API specification
      res.json({
        messages: history
      });

    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation history'
      });
    }
  }

  // Clear conversation history - matches exact API specification
  async clearHistory(req, res) {
    try {
      const { sessionId = 'default' } = req.body;
      
      if (sessionId === 'all') {
        this.conversationHistory.clear();
      } else {
        this.conversationHistory.delete(sessionId);
      }

      // Return response matching exact API specification
      res.json({
        success: true
      });

    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear conversation history'
      });
    }
  }

  // Test LLM service connection - matches exact API specification
  async testService(req, res) {
    try {
      const { service } = req.query;
      
      const result = await this.llmManager.testConnection(service);
      
      // Return response matching exact API specification
      res.json({
        success: result.success,
        service: service
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

  // Get available services - matches exact API specification
  async getAvailableServices(req, res) {
    try {
      const services = this.llmManager.getAvailableServices();
      
      // Return response matching exact API specification
      res.json({
        services: services
      });

    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available services'
      });
    }
  }

  // Get welcome message - matches exact API specification
  async getWelcomeMessage(req, res) {
    try {
      const welcomeMessage = `Hello! I'm your RCA (Root Cause Analysis) AI assistant. 
I help with IT incident management, troubleshooting, and root cause analysis. 
How can I assist you with your incident investigation today?`;

      // Return response matching exact API specification
      res.json({
        response: welcomeMessage
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
