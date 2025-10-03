/**
 * Text Enhancement Agent Configuration
 */

const config = {
  // LLM Configuration
  llm: {
    provider: process.env.LLM_PROVIDER || 'gemini',
    model: process.env.LLM_MODEL || 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
    timeout: 30000
  },

  // Text Enhancement specific settings
  textEnhancement: {
    // Default enhancement type
    defaultEnhancementType: 'clarity',
    
    // Default quality level
    defaultQualityLevel: 'standard',
    
    // Maximum enhancement ratio (1.3 = 130% of original length)
    maxEnhancementRatio: 1.3,
    
    // Minimum confidence threshold for accepting results
    minConfidenceThreshold: 60,
    
    // Enable fallback enhancement when API quota exceeded
    enableFallbackEnhancement: true,
    
    // Analysis timeout in milliseconds
    analysisTimeout: 60000,
    
    // Enable detailed logging
    enableDetailedLogging: process.env.NODE_ENV === 'development'
  },

  // Default values
  defaults: {
    defaultEnhancementType: 'clarity',
    defaultQualityLevel: 'standard',
    defaultConfidence: 75
  }
};

module.exports = config;
