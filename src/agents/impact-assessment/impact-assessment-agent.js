/**
 * Impact Assessment Agent
 * Analyzes problem statements and timeline context to determine impact level and affected department
 */

const { LLMManager } = require('../../services/llm');
const { validateInput } = require('../shared/utils/validation');
const { formatResponse } = require('../shared/utils/response-formatting');
const {
  IMPACT_LEVELS,
  IMPACT_LEVEL_LIST,
  DEPARTMENTS,
  DEPARTMENT_LIST,
  isValidImpactLevel,
  isValidDepartment
} = require('../../constants/impactAssessment');

class ImpactAssessmentAgent {
  constructor(config) {
    this.config = config;
    this.llmManager = new LLMManager();
  }

  /**
   * Analyze impact based on problem statement and timeline context
   * @param {Object} input - Input data containing problemStatement and timelineContext
   * @returns {Object} - Impact assessment result
   */
  async analyzeImpact(input) {
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

      const { problemStatement, timelineContext } = input;

      // Create the analysis prompt
      const prompt = this.createAnalysisPrompt(problemStatement, timelineContext);

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
        // If API quota exceeded or service unavailable, provide a fallback response
        if (llmResponse.error && (
          llmResponse.error.includes('quota') || 
          llmResponse.error.includes('overloaded') ||
          llmResponse.error.includes('503') ||
          llmResponse.error.includes('Service Unavailable')
        )) {
          console.log('⚠️ API service unavailable or overloaded, using fallback assessment');
          return this.generateFallbackAssessment(input);
        }
        
        return {
          success: false,
          error: 'Failed to generate impact assessment',
          details: llmResponse.error
        };
      }

      // Parse and validate the response
      const parsedResponse = this.parseResponse(llmResponse.response);
      
      if (!parsedResponse.success) {
        return {
          success: false,
          error: 'Failed to parse impact assessment response',
          details: parsedResponse.errors
        };
      }

      // Format the final response
      return {
        success: true,
        data: {
          impactAssessment: parsedResponse.data.impactAssessment,
          impactLevel: parsedResponse.data.impactLevel,
          department: parsedResponse.data.department,
          confidence: parsedResponse.data.confidence,
          reasoning: parsedResponse.data.reasoning,
          recommendations: parsedResponse.data.recommendations
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Impact assessment analysis failed',
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

    if (!input.problemStatement || typeof input.problemStatement !== 'string' || input.problemStatement.trim().length === 0) {
      errors.push('problemStatement is required and must be a non-empty string');
    }

    if (!input.timelineContext || typeof input.timelineContext !== 'string' || input.timelineContext.trim().length === 0) {
      errors.push('timelineContext is required and must be a non-empty string');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Create the analysis prompt for the LLM
   * @param {string} problemStatement - The problem statement
   * @param {string} timelineContext - Timeline and context information
   * @returns {string} - Formatted prompt
   */
  createAnalysisPrompt(problemStatement, timelineContext) {
    return `You are an expert impact assessment analyst. Analyze the following incident and determine its impact level and affected department.

PROBLEM STATEMENT:
${problemStatement}

TIMELINE AND CONTEXT:
${timelineContext}

IMPACT LEVELS AVAILABLE:
${IMPACT_LEVEL_LIST.map((level, index) => `${index + 1}. ${level}`).join('\n')}

DEPARTMENTS AVAILABLE:
${DEPARTMENT_LIST.map((dept, index) => `${index + 1}. ${dept}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Analyze the business impact based on the problem statement and timeline
2. Consider factors like:
   - Number of users affected
   - Business function disruption
   - Revenue impact
   - Customer experience impact
   - System availability
   - Data integrity concerns
   - Security implications
3. Determine the most appropriate impact level
4. Identify the primary affected department
5. Provide confidence level (0-100%)
6. Explain your reasoning
7. Provide recommendations for mitigation

RESPONSE FORMAT (JSON):
{
  "impactAssessment": "Detailed assessment of the impact including business implications, user impact, and operational effects",
  "impactLevel": "One of the available impact levels",
  "department": "One of the available departments",
  "confidence": 85,
  "reasoning": "Explanation of why this impact level and department were selected",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

IMPORTANT: 
- Respond ONLY with valid JSON
- Use exact impact level and department names from the lists above
- Confidence should be a number between 0-100
- Provide specific, actionable recommendations
- Consider both immediate and long-term impacts`;
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
      if (!parsed.impactAssessment || typeof parsed.impactAssessment !== 'string') {
        errors.push('impactAssessment is required and must be a string');
      }

      if (!parsed.impactLevel || !isValidImpactLevel(parsed.impactLevel)) {
        errors.push(`impactLevel must be one of: ${IMPACT_LEVEL_LIST.join(', ')}`);
      }

      if (!parsed.department || !isValidDepartment(parsed.department)) {
        errors.push(`department must be one of: ${DEPARTMENT_LIST.join(', ')}`);
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
        errors.push('confidence must be a number between 0 and 100');
      }

      if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
        errors.push('reasoning is required and must be a string');
      }

      if (!Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
        errors.push('recommendations must be a non-empty array');
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
          impactAssessment: parsed.impactAssessment.trim(),
          impactLevel: parsed.impactLevel,
          department: parsed.department,
          confidence: Math.round(parsed.confidence),
          reasoning: parsed.reasoning.trim(),
          recommendations: parsed.recommendations.map(rec => rec.trim()).filter(rec => rec.length > 0)
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
   * Generate fallback assessment when API quota is exceeded
   * @param {Object} input - Input data
   * @returns {Object} - Fallback assessment result
   */
  generateFallbackAssessment(input) {
    const { problemStatement, timelineContext } = input;
    
    // Simple keyword-based assessment
    const problemLower = problemStatement.toLowerCase();
    const timelineLower = timelineContext.toLowerCase();
    
    let impactLevel = IMPACT_LEVELS.SEV3_NORMAL;
    let department = DEPARTMENTS.IT_OPERATIONS;
    let confidence = 60;
    
    // Determine impact level based on keywords
    if (problemLower.includes('down') || problemLower.includes('crash') || problemLower.includes('critical')) {
      impactLevel = IMPACT_LEVELS.SEV1_CRITICAL;
      confidence = 85;
    } else if (problemLower.includes('slow') || problemLower.includes('major') || problemLower.includes('significant')) {
      impactLevel = IMPACT_LEVELS.SEV2_MAJOR;
      confidence = 75;
    } else if (problemLower.includes('minor') || problemLower.includes('small') || problemLower.includes('cosmetic')) {
      impactLevel = IMPACT_LEVELS.SEV4_MINOR;
      confidence = 70;
    }
    
    // Determine department based on keywords
    if (problemLower.includes('customer') || problemLower.includes('support') || problemLower.includes('user')) {
      department = DEPARTMENTS.CUSTOMER_SUPPORT;
    } else if (problemLower.includes('sales') || problemLower.includes('crm') || problemLower.includes('revenue')) {
      department = DEPARTMENTS.SALES;
    } else if (problemLower.includes('finance') || problemLower.includes('billing') || problemLower.includes('payment')) {
      department = DEPARTMENTS.FINANCE;
    } else if (problemLower.includes('hr') || problemLower.includes('employee') || problemLower.includes('human')) {
      department = DEPARTMENTS.HUMAN_RESOURCES;
    }
    
    return {
      success: true,
      data: {
        impactAssessment: `Based on keyword analysis: ${problemStatement}. This appears to be a ${impactLevel.toLowerCase()} issue affecting ${department.toLowerCase()}.`,
        impactLevel: impactLevel,
        department: department,
        confidence: confidence,
        reasoning: `Fallback assessment based on keyword analysis due to API quota limitations. Analyzed problem statement and timeline context for key indicators.`,
        recommendations: [
          "Contact API provider to increase quota limits",
          "Implement proper monitoring and alerting",
          "Consider upgrading to paid API plan for production use",
          "Review incident response procedures",
          "Document lessons learned for future incidents"
        ]
      }
    };
  }

  /**
   * Get available impact levels and departments
   * @returns {Object} - Available options
   */
  getAvailableOptions() {
    return {
      impactLevels: IMPACT_LEVEL_LIST,
      departments: DEPARTMENT_LIST
    };
  }
}

module.exports = ImpactAssessmentAgent;
