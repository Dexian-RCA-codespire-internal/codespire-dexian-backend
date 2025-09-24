/**
 * Impact Assessment Agent Configuration
 */

const config = {
  // LLM Configuration
  llm: {
    provider: process.env.LLM_PROVIDER || 'gemini',
    model: process.env.LLM_MODEL || 'gemini-1.5-flash',
    temperature: 0.3,
    maxTokens: 1000,
    timeout: 30000
  },

  // Impact Assessment specific settings
  impactAssessment: {
    // Minimum confidence threshold for accepting results
    minConfidenceThreshold: 70,
    
    // Maximum number of recommendations to generate
    maxRecommendations: 5,
    
    // Analysis timeout in milliseconds
    analysisTimeout: 60000,
    
    // Enable detailed logging
    enableDetailedLogging: process.env.NODE_ENV === 'development'
  },

  // Default values
  defaults: {
    defaultImpactLevel: 'Sev 3 - Normal Impact',
    defaultDepartment: 'IT Operations',
    defaultConfidence: 75
  }
};

module.exports = config;
