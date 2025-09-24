/**
 * Text Enhancement Agent
 * Enhances text quality while maintaining conciseness
 */

const { LLMManager } = require('../../services/llm');
const { validateInput } = require('../shared/utils/validation');
const { formatResponse } = require('../shared/utils/response-formatting');
const {
  ENHANCEMENT_TYPES,
  ENHANCEMENT_TYPE_LIST,
  QUALITY_LEVELS,
  LENGTH_CONSTRAINTS,
  FOCUS_AREAS,
  isValidEnhancementType,
  isValidQualityLevel,
  calculateEnhancementRatio,
  isEnhancementRatioAcceptable
} = require('../../constants/textEnhancement');

class TextEnhancementAgent {
  constructor(config) {
    this.config = config;
    this.llmManager = new LLMManager();
  }

  /**
   * Enhance text based on input text and reference
   * @param {Object} input - Input data containing text and reference
   * @returns {Object} - Enhancement result
   */
  async enhanceText(input) {
    try {
      // Validate input
      const validation = this.validateInput(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid input',
          details: validation.errors
        };
      }

      const { text, reference } = input;
      const enhancementType = ENHANCEMENT_TYPES.CLARITY; // Default to clarity
      const qualityLevel = QUALITY_LEVELS.STANDARD; // Default to standard

      // Create the enhancement prompt
      const prompt = this.createEnhancementPrompt(text, reference, enhancementType, qualityLevel);

      // Get LLM response
      const llmResponse = await this.llmManager.generateResponse(
        this.config.llm.provider, 
        prompt, 
        {
          temperature: this.config.llm.temperature,
          maxTokens: this.config.llm.maxTokens
        }
      );

      if (!llmResponse.success) {
        // If API quota exceeded, provide a fallback response
        if (llmResponse.error && llmResponse.error.includes('quota')) {
          console.log('⚠️ API quota exceeded, using fallback enhancement');
          return this.generateFallbackEnhancement(input);
        }
        
        return {
          success: false,
          error: 'Failed to generate text enhancement',
          details: llmResponse.error
        };
      }

      // Parse and validate the response
      const parsedResponse = this.parseResponse(llmResponse.response);
      
      if (!parsedResponse.success) {
        return {
          success: false,
          error: 'Failed to parse enhancement response',
          details: parsedResponse.errors
        };
      }

      // Validate enhancement ratio
      const enhancementRatio = calculateEnhancementRatio(text, parsedResponse.data.enhancedText);
      if (!isEnhancementRatioAcceptable(text, parsedResponse.data.enhancedText)) {
        console.log('⚠️ Enhancement ratio too high, applying length constraints');
        parsedResponse.data.enhancedText = this.applyLengthConstraints(text, parsedResponse.data.enhancedText);
        parsedResponse.data.enhancementRatio = calculateEnhancementRatio(text, parsedResponse.data.enhancedText);
      } else {
        parsedResponse.data.enhancementRatio = enhancementRatio;
      }

      // Format the final response
      return {
        success: true,
        data: {
          enhancedText: parsedResponse.data.enhancedText,
          enhancementType: parsedResponse.data.enhancementType,
          qualityLevel: parsedResponse.data.qualityLevel,
          enhancementRatio: parsedResponse.data.enhancementRatio,
          improvements: parsedResponse.data.improvements,
          confidence: parsedResponse.data.confidence
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Text enhancement failed',
        details: error.message
      };
    }
  }

  /**
   * Validate input parameters
   * @param {Object} input - Input data to validate
   * @returns {Object} - Validation result
   */
  validateInput(input) {
    const errors = [];

    if (!input.text || typeof input.text !== 'string' || input.text.trim().length === 0) {
      errors.push('text is required and must be a non-empty string');
    } else {
      if (input.text.length < LENGTH_CONSTRAINTS.MIN_LENGTH) {
        errors.push(`text must be at least ${LENGTH_CONSTRAINTS.MIN_LENGTH} characters`);
      }
      if (input.text.length > LENGTH_CONSTRAINTS.MAX_LENGTH) {
        errors.push(`text must not exceed ${LENGTH_CONSTRAINTS.MAX_LENGTH} characters`);
      }
    }

    if (input.reference && typeof input.reference !== 'string') {
      errors.push('reference must be a string');
    }

    // enhancementType and qualityLevel are now defaulted, no need to validate

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Create the enhancement prompt for the LLM
   * @param {string} text - Text to enhance
   * @param {string} reference - Reference context
   * @param {string} enhancementType - Type of enhancement
   * @param {string} qualityLevel - Quality level
   * @returns {string} - Formatted prompt
   */
  createEnhancementPrompt(text, reference, enhancementType, qualityLevel) {
    const enhancementInstructions = this.getEnhancementInstructions(enhancementType, qualityLevel);
    
    return `You are an expert text enhancement specialist. Enhance the following text while keeping it concise and maintaining its core meaning.

ORIGINAL TEXT:
"${text}"

REFERENCE CONTEXT:
${reference || 'No reference context provided'}

ENHANCEMENT REQUIREMENTS:
${enhancementInstructions}

IMPORTANT CONSTRAINTS:
1. Keep the enhanced text within 130% of the original length (${Math.round(text.length * 1.3)} characters max)
2. Maintain the original meaning and intent
3. Improve clarity, grammar, and flow
4. Make it more professional and engaging
5. Don't add unnecessary words or phrases
6. Preserve any technical terms or specific information

RESPONSE FORMAT (JSON):
{
  "enhancedText": "The improved version of the text",
  "enhancementType": "${enhancementType}",
  "qualityLevel": "${qualityLevel}",
  "improvements": ["List of specific improvements made"],
  "confidence": 85
}

IMPORTANT: 
- Respond ONLY with valid JSON
- Enhanced text should be significantly better but not much longer
- Focus on quality improvements, not quantity
- Confidence should be a number between 0-100`;
  }

  /**
   * Get enhancement instructions based on type and quality level
   * @param {string} enhancementType - Type of enhancement
   * @param {string} qualityLevel - Quality level
   * @returns {string} - Enhancement instructions
   */
  getEnhancementInstructions(enhancementType, qualityLevel) {
    const baseInstructions = {
      [ENHANCEMENT_TYPES.GRAMMAR]: 'Fix all grammar, spelling, and punctuation errors. Ensure proper sentence structure.',
      [ENHANCEMENT_TYPES.CLARITY]: 'Improve clarity and readability. Make the text easier to understand.',
      [ENHANCEMENT_TYPES.PROFESSIONAL]: 'Make the text more professional and formal. Use appropriate business language.',
      [ENHANCEMENT_TYPES.CONCISE]: 'Make the text more concise and to the point. Remove unnecessary words.',
      [ENHANCEMENT_TYPES.ENGAGING]: 'Make the text more engaging and interesting. Add personality while maintaining professionalism.',
      [ENHANCEMENT_TYPES.TECHNICAL]: 'Enhance technical accuracy and precision. Use appropriate technical terminology.',
      [ENHANCEMENT_TYPES.CREATIVE]: 'Add creative flair and style. Make the text more expressive and original.'
    };

    const qualityInstructions = {
      [QUALITY_LEVELS.BASIC]: 'Apply basic improvements with minimal changes.',
      [QUALITY_LEVELS.STANDARD]: 'Apply standard improvements with moderate changes.',
      [QUALITY_LEVELS.PREMIUM]: 'Apply comprehensive improvements with significant enhancements.'
    };

    return `${baseInstructions[enhancementType]} ${qualityInstructions[qualityLevel]}`;
  }

  /**
   * Parse and validate the LLM response
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed and validated response
   */
  parseResponse(response) {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          errors: ['No valid JSON found in response']
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const errors = [];

      // Validate required fields
      if (!parsed.enhancedText || typeof parsed.enhancedText !== 'string') {
        errors.push('enhancedText is required and must be a string');
      }

      if (!parsed.enhancementType || !isValidEnhancementType(parsed.enhancementType)) {
        errors.push(`enhancementType must be one of: ${ENHANCEMENT_TYPE_LIST.join(', ')}`);
      }

      if (!parsed.qualityLevel || !isValidQualityLevel(parsed.qualityLevel)) {
        errors.push(`qualityLevel must be one of: ${Object.values(QUALITY_LEVELS).join(', ')}`);
      }

      if (!Array.isArray(parsed.improvements) || parsed.improvements.length === 0) {
        errors.push('improvements must be a non-empty array');
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
        errors.push('confidence must be a number between 0 and 100');
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors: errors
        };
      }

      return {
        success: true,
        data: {
          enhancedText: parsed.enhancedText.trim(),
          enhancementType: parsed.enhancementType,
          qualityLevel: parsed.qualityLevel,
          improvements: parsed.improvements.map(imp => imp.trim()).filter(imp => imp.length > 0),
          confidence: Math.round(parsed.confidence)
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse response: ${error.message}`]
      };
    }
  }

  /**
   * Apply length constraints to enhanced text
   * @param {string} originalText - Original text
   * @param {string} enhancedText - Enhanced text
   * @returns {string} - Constrained enhanced text
   */
  applyLengthConstraints(originalText, enhancedText) {
    const maxLength = Math.min(
      Math.round(originalText.length * LENGTH_CONSTRAINTS.ENHANCEMENT_RATIO),
      LENGTH_CONSTRAINTS.MAX_ENHANCEMENT_LENGTH
    );

    if (enhancedText.length <= maxLength) {
      return enhancedText;
    }

    // Truncate at the last complete sentence
    const truncated = enhancedText.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // If no good sentence break, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace);
    }

    return truncated;
  }

  /**
   * Generate fallback enhancement when API quota is exceeded
   * @param {Object} input - Input data
   * @returns {Object} - Fallback enhancement result
   */
  generateFallbackEnhancement(input) {
    const { text, reference } = input;
    const enhancementType = ENHANCEMENT_TYPES.CLARITY; // Default to clarity
    
    // Simple rule-based enhancement
    let enhancedText = text;
    const improvements = [];

    // Basic grammar fixes
    enhancedText = enhancedText.replace(/\s+/g, ' ').trim();
    enhancedText = enhancedText.replace(/([.!?])\s*([a-z])/g, '$1 $2');
    enhancedText = enhancedText.charAt(0).toUpperCase() + enhancedText.slice(1);
    
    if (!enhancedText.endsWith('.') && !enhancedText.endsWith('!') && !enhancedText.endsWith('?')) {
      enhancedText += '.';
      improvements.push('Added proper sentence ending');
    }

    // Basic improvements
    if (enhancedText !== text) {
      improvements.push('Fixed basic formatting');
    }

    // Ensure length constraints
    if (enhancedText.length > text.length * LENGTH_CONSTRAINTS.ENHANCEMENT_RATIO) {
      enhancedText = this.applyLengthConstraints(text, enhancedText);
    }

    return {
      success: true,
      data: {
        enhancedText: enhancedText,
        enhancementType: enhancementType,
        qualityLevel: QUALITY_LEVELS.BASIC,
        enhancementRatio: calculateEnhancementRatio(text, enhancedText),
        improvements: improvements.length > 0 ? improvements : ['Applied basic formatting'],
        confidence: 60
      }
    };
  }

  /**
   * Get available enhancement types and quality levels
   * @returns {Object} - Available options
   */
  getAvailableOptions() {
    return {
      enhancementTypes: ENHANCEMENT_TYPE_LIST,
      qualityLevels: Object.values(QUALITY_LEVELS),
      focusAreas: Object.values(FOCUS_AREAS)
    };
  }
}

module.exports = TextEnhancementAgent;
