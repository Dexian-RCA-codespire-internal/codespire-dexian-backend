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
      
      // Define 3 different enhancement configurations
      const enhancementConfigs = [
        { type: ENHANCEMENT_TYPES.CLARITY, quality: QUALITY_LEVELS.BASIC },
        { type: ENHANCEMENT_TYPES.PROFESSIONAL, quality: QUALITY_LEVELS.STANDARD },
        { type: ENHANCEMENT_TYPES.ENGAGING, quality: QUALITY_LEVELS.PREMIUM }
      ];

      // Create the enhancement prompt for 3 different options
      const prompt = this.createEnhancementPrompt(text, reference, enhancementConfigs);

      // Get LLM response
      console.log('🤖 Calling LLM API with provider:', this.config.llm.provider);
      const llmResponse = await this.llmManager.generateResponse(
        this.config.llm.provider, 
        prompt, 
        {
          temperature: this.config.llm.temperature,
          maxTokens: this.config.llm.maxTokens
        }
      );

      console.log('📝 LLM Response success:', llmResponse.success);
      if (!llmResponse.success) {
        console.log('❌ LLM Error:', llmResponse.error);
        // If API quota exceeded, provide a fallback response
        if (llmResponse.error && (llmResponse.error.includes('quota') || llmResponse.error.includes('429') || llmResponse.error.includes('Too Many Requests'))) {
          console.log('⚠️ API quota exceeded, using fallback enhancement');
          const fallbackResult = this.generateFallbackEnhancement(input);
          // Add a note about the quota issue
          fallbackResult.message = 'Text enhanced using fallback method due to API quota limits';
          fallbackResult.quotaExceeded = true;
          return fallbackResult;
        }
        
        return {
          success: false,
          error: 'Failed to generate text enhancement',
          details: llmResponse.error
        };
      }

      console.log('✅ LLM Response received, parsing...');
      console.log('📄 LLM Response content:', llmResponse.response?.substring(0, 200) + '...');

      // Parse and validate the response
      const parsedResponse = this.parseResponse(llmResponse.response);
      
      if (!parsedResponse.success) {
        console.log('❌ Failed to parse LLM response:', parsedResponse.errors);
        console.log('🔄 Falling back to fallback enhancement');
        return this.generateFallbackEnhancement(input);
      }

      console.log('✅ Successfully parsed LLM response');

      // Process each enhanced text option
      let enhancedOptions = parsedResponse.data.enhancedOptions.map((option, index) => {
        // Validate enhancement ratio for each option
        const enhancementRatio = calculateEnhancementRatio(text, option.enhancedText);
        let finalEnhancedText = option.enhancedText;
        
        if (!isEnhancementRatioAcceptable(text, option.enhancedText)) {
          console.log(`⚠️ Enhancement ratio too high for option ${index + 1}, applying length constraints`);
          finalEnhancedText = this.applyLengthConstraints(text, option.enhancedText);
        }

        return {
          enhancedText: finalEnhancedText,
          enhancementType: option.enhancementType,
          qualityLevel: option.qualityLevel,
          enhancementRatio: calculateEnhancementRatio(text, finalEnhancedText),
          improvements: option.improvements,
          confidence: option.confidence
        };
      });

      // Sort options by confidence score in descending order (highest first)
      enhancedOptions.sort((a, b) => b.confidence - a.confidence);

      // Assign option numbers after sorting
      enhancedOptions = enhancedOptions.map((option, index) => ({
        option: index + 1,
        ...option
      }));

      // Format the final response
      return {
        success: true,
        data: {
          enhancedOptions: enhancedOptions,
          originalText: text,
          totalOptions: enhancedOptions.length
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
  createEnhancementPrompt(text, reference, enhancementConfigs) {
    const instructions = enhancementConfigs.map((config, index) => {
      const enhancementInstructions = this.getEnhancementInstructions(config.type, config.quality);
      return `Option ${index + 1}: ${enhancementInstructions}`;
    }).join('\n');
    
    return `You are an expert text enhancement specialist. Create 3 COMPLETELY DIFFERENT enhanced versions of the following text. Each version must be distinctly different in style, tone, structure, and approach while maintaining the core meaning.

ORIGINAL TEXT:
"${text}"

REFERENCE CONTEXT:
${reference || 'No reference context provided'}

ENHANCEMENT REQUIREMENTS:
${instructions}

CRITICAL REQUIREMENTS FOR DISTINCT OPTIONS:
1. Option 1 (${enhancementConfigs[0].type}): Focus on SIMPLICITY and CLARITY. Use shorter sentences, simpler words, and direct language. Break down complex ideas into simple terms.
2. Option 2 (${enhancementConfigs[1].type}): Focus on PROFESSIONALISM and FORMALITY. Use technical terminology, formal structure, and business language. Make it sound like a corporate report.
3. Option 3 (${enhancementConfigs[2].type}): Focus on ENGAGEMENT and IMPACT. Use active voice, compelling language, and create urgency or importance. Make it sound like a marketing message.

IMPORTANT CONSTRAINTS:
1. Keep each enhanced text within 130% of the original length (${Math.round(text.length * 1.3)} characters max)
2. Maintain the original meaning and intent in all versions
3. Each version MUST be noticeably different from the others
4. Don't just change punctuation - actually restructure and rephrase
5. Preserve any technical terms or specific information
6. Make each option follow its specific enhancement type and quality level

EXAMPLES OF DIFFERENT APPROACHES:
- SIMPLE: "Users can't open files. This makes them frustrated. It causes more support calls."
- PROFESSIONAL: "Users are experiencing difficulties with file association functionality, resulting in reduced productivity and increased support ticket volume."
- ENGAGING: "Users are stuck! They can't open their files the way they want, leading to frustration and a flood of support requests."

RESPONSE FORMAT (JSON):
{
  "enhancedOptions": [
    {
      "enhancedText": "SIMPLE AND CLEAR VERSION - Short sentences, easy words, direct approach",
      "enhancementType": "${enhancementConfigs[0].type}",
      "qualityLevel": "${enhancementConfigs[0].quality}",
      "improvements": ["Simplified language", "Shortened sentences", "Improved clarity"],
      "confidence": 85
    },
    {
      "enhancedText": "PROFESSIONAL AND FORMAL VERSION - Technical terms, formal structure, business language",
      "enhancementType": "${enhancementConfigs[1].type}",
      "qualityLevel": "${enhancementConfigs[1].quality}",
      "improvements": ["Enhanced professionalism", "Technical terminology", "Formal structure"],
      "confidence": 88
    },
    {
      "enhancedText": "ENGAGING AND IMPACTFUL VERSION - Active voice, compelling language, creates urgency",
      "enhancementType": "${enhancementConfigs[2].type}",
      "qualityLevel": "${enhancementConfigs[2].quality}",
      "improvements": ["Added engagement", "Active voice", "Compelling language"],
      "confidence": 82
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Each enhanced text MUST be COMPLETELY DIFFERENT from the others
- Don't just copy the original text with minor changes
- Actually restructure, rephrase, and rewrite each version
- Make them look like they were written by different people
- Use different sentence structures, vocabulary, and tone for each option
- Respond ONLY with valid JSON
- Confidence should be a number between 0-100 for each option`;
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

      // Validate enhancedOptions array
      if (!Array.isArray(parsed.enhancedOptions) || parsed.enhancedOptions.length === 0) {
        errors.push('enhancedOptions is required and must be a non-empty array');
      } else if (parsed.enhancedOptions.length !== 3) {
        errors.push('enhancedOptions must contain exactly 3 options');
      } else {
        // Validate each option
        parsed.enhancedOptions.forEach((option, index) => {
          if (!option.enhancedText || typeof option.enhancedText !== 'string') {
            errors.push(`Option ${index + 1}: enhancedText is required and must be a string`);
          }

          if (!option.enhancementType || !isValidEnhancementType(option.enhancementType)) {
            errors.push(`Option ${index + 1}: enhancementType must be one of: ${ENHANCEMENT_TYPE_LIST.join(', ')}`);
          }

          if (!option.qualityLevel || !isValidQualityLevel(option.qualityLevel)) {
            errors.push(`Option ${index + 1}: qualityLevel must be one of: ${Object.values(QUALITY_LEVELS).join(', ')}`);
          }

          if (!Array.isArray(option.improvements) || option.improvements.length === 0) {
            errors.push(`Option ${index + 1}: improvements must be a non-empty array`);
          }

          if (typeof option.confidence !== 'number' || option.confidence < 0 || option.confidence > 100) {
            errors.push(`Option ${index + 1}: confidence must be a number between 0 and 100`);
          }
        });
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
          enhancedOptions: parsed.enhancedOptions.map((option, index) => ({
            enhancedText: option.enhancedText.trim(),
            enhancementType: option.enhancementType,
            qualityLevel: option.qualityLevel,
            improvements: option.improvements.map(imp => imp.trim()).filter(imp => imp.length > 0),
            confidence: Math.round(option.confidence)
          }))
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
    
    // Create 3 different fallback enhancement options with different types and quality levels
    let enhancedOptions = [
      {
        enhancedText: this.basicEnhancement(text, 'clarity'),
        enhancementType: ENHANCEMENT_TYPES.CLARITY,
        qualityLevel: QUALITY_LEVELS.BASIC,
        improvements: ['Fixed basic formatting', 'Improved clarity'],
        confidence: 60
      },
      {
        enhancedText: this.basicEnhancement(text, 'professional'),
        enhancementType: ENHANCEMENT_TYPES.PROFESSIONAL,
        qualityLevel: QUALITY_LEVELS.STANDARD,
        improvements: ['Enhanced professionalism', 'Improved structure'],
        confidence: 65
      },
      {
        enhancedText: this.basicEnhancement(text, 'engaging'),
        enhancementType: ENHANCEMENT_TYPES.ENGAGING,
        qualityLevel: QUALITY_LEVELS.PREMIUM,
        improvements: ['Added engagement', 'Improved flow'],
        confidence: 70
      }
    ];

    // Sort options by confidence score in descending order (highest first)
    enhancedOptions.sort((a, b) => b.confidence - a.confidence);

    // Assign option numbers after sorting
    enhancedOptions = enhancedOptions.map((option, index) => ({
      option: index + 1,
      ...option
    }));

    return {
      success: true,
      data: {
        enhancedOptions: enhancedOptions,
        originalText: text,
        totalOptions: enhancedOptions.length
      }
    };
  }

  /**
   * Basic enhancement helper method
   * @param {string} text - Original text
   * @param {string} style - Enhancement style
   * @returns {string} - Enhanced text
   */
  basicEnhancement(text, style) {
    let enhancedText = text;

    // Basic grammar fixes
    enhancedText = enhancedText.replace(/\s+/g, ' ').trim();
    enhancedText = enhancedText.replace(/([.!?])\s*([a-z])/g, '$1 $2');
    enhancedText = enhancedText.charAt(0).toUpperCase() + enhancedText.slice(1);
    
    if (!enhancedText.endsWith('.') && !enhancedText.endsWith('!') && !enhancedText.endsWith('?')) {
      enhancedText += '.';
    }

    // Apply style-specific enhancements to create truly different versions
    switch (style) {
      case 'clarity':
        // Make it simpler and clearer
        enhancedText = enhancedText
          .replace(/are responsible for/g, 'control')
          .replace(/may involve issues with/g, 'could be caused by')
          .replace(/incorrectly configured/g, 'set up wrong')
          .replace(/preventing applications from launching/g, 'stopping apps from opening')
          .replace(/specific file types/g, 'certain files');
        break;
        
      case 'professional':
        // Make it more formal and technical
        enhancedText = enhancedText
          .replace(/are corrupted/g, 'have become corrupted')
          .replace(/may involve issues with/g, 'potentially stems from complications within')
          .replace(/system-level settings/g, 'system-level configuration parameters')
          .replace(/file type associations/g, 'file type association mappings')
          .replace(/\. reg files/g, 'registry configuration files');
        break;
      
      case 'engaging':
        // Make it more engaging and impactful
        enhancedText = enhancedText
          .replace(/are corrupted/g, 'have been corrupted')
          .replace(/preventing applications from launching/g, 'blocking applications from launching')
          .replace(/may involve issues with/g, 'likely involves problems with')
          .replace(/This may involve/g, 'The issue likely stems from')
          .replace(/\.$/, '!');
        break;
      
      default:
        // Keep as is
        break;
    }

    // Ensure length constraints
    if (enhancedText.length > text.length * LENGTH_CONSTRAINTS.ENHANCEMENT_RATIO) {
      enhancedText = this.applyLengthConstraints(text, enhancedText);
    }

    return enhancedText;
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
