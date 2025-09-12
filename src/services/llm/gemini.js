// new file servicenow
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.projectDescription = process.env.PROJECT_DESCRIPTION || "RCA (Root Cause Analysis) system for IT incident management with ticket tracking, investigation workflows, and AI-powered assistance";
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 20,
        temperature: 0.3,
        topP: 0.7,
        topK: 20
      }
    });
  }

  async testConnection() {
    try {
      const result = await this.model.generateContent("Hello, this is a connection test.");
      return {
        success: true,
        message: "Gemini connection successful",
        response: result.response.text()
      };
    } catch (error) {
      return {
        success: false,
        message: "Gemini connection failed",
        error: error.message
      };
    }
  }

  async generateResponse(prompt, options = {}) {
    try {
      const {
        maxTokens = 100,
        temperature = 0.7,
        systemPrompt = null,
        context = null
      } = options;

      // Build the full prompt with context and system instructions
      let fullPrompt = '';
      
      if (systemPrompt) {
        fullPrompt += `System: ${systemPrompt}\n\n`;
      } else {
        // Default system prompt for RCA system
        fullPrompt += `System: You are an RCA AI assistant. 
        Respond in EXACTLY 1 LINE with clear, actionable advice.\n\n`;
      }
      
      if (context) {
        fullPrompt += `Context: ${context}\n\n`;
      }
      
      fullPrompt += `User: ${prompt}`;

      // Use optimized generation config for speed
      const generationConfig = {
        maxOutputTokens: Math.min(maxTokens, 20),
        temperature: Math.min(temperature, 0.3),
        topP: 0.7,
        topK: 20
      };

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
        usage: {
          promptTokens: Math.ceil(fullPrompt.length / 4),
          completionTokens: Math.ceil(text.length / 4),
          totalTokens: Math.ceil((fullPrompt.length + text.length) / 4)
        }
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  // Fast response method for simple queries
  async generateFastResponse(prompt) {
    try {
      const simplePrompt = `System: You are an RCA AI assistant. Respond in EXACTLY 1 LINE with clear, actionable advice.
      
User: ${prompt}`;

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: simplePrompt }] }],
        generationConfig: {
          maxOutputTokens: 15,
          temperature: 0.2,
          topP: 0.6,
          topK: 15
        }
      });

      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
        usage: {
          promptTokens: Math.ceil(simplePrompt.length / 4),
          completionTokens: Math.ceil(text.length / 4),
          totalTokens: Math.ceil((simplePrompt.length + text.length) / 4)
        }
      };
    } catch (error) {
      console.error('Fast response error:', error);
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  // Simple token estimation (rough approximation)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Adaptive prompting for different types of queries
  async generateAdaptiveResponse(message, conversationHistory = []) {
    try {
      // Analyze the message to determine the best approach
      const messageType = this.analyzeMessageType(message);
      
      let systemPrompt = '';
      let context = '';
      
      switch (messageType) {
        case 'incident':
          systemPrompt = `You are an IT incident expert. 
          Respond in EXACTLY 1 LINE with clear, actionable advice.`;
          break;
          
        case 'ticket':
          systemPrompt = `You are a helpdesk assistant. 
          Respond in EXACTLY 1 LINE with clear, actionable advice.`;
          break;
          
        case 'analysis':
          systemPrompt = `You are a data analyst. 
          Respond in EXACTLY 1 LINE with clear, actionable advice.`;
          break;
          
        case 'general':
        default:
          systemPrompt = `You are an RCA AI assistant. 
          Respond in EXACTLY 1 LINE with clear, actionable advice.`;
          break;
      }
      
      // Add conversation context if available
      if (conversationHistory.length > 0) {
        context = `Previous conversation:\n${conversationHistory.slice(-3).map(msg => 
          `${msg.role}: ${msg.content}`
        ).join('\n')}`;
      }
      
      return await this.generateResponse(message, {
        systemPrompt,
        context,
        maxTokens: 20, // Limit to very short response
        temperature: 0.3
      });
      
    } catch (error) {
      console.error('Adaptive response error:', error);
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  // Analyze message type for adaptive prompting
  analyzeMessageType(message) {
    const lowerMessage = message.toLowerCase();
    
    const incidentKeywords = ['incident', 'outage', 'down', 'error', 'failure', 'issue', 'problem'];
    const ticketKeywords = ['ticket', 'request', 'support', 'help', 'assistance'];
    const analysisKeywords = ['analyze', 'analysis', 'root cause', 'why', 'investigate', 'pattern'];
    
    if (incidentKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'incident';
    }
    
    if (ticketKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'ticket';
    }
    
    if (analysisKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'analysis';
    }
    
    return 'general';
  }
}

module.exports = { GeminiService };
