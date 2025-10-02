/**
 * Impact Assessment Agent
 * Analyzes problem statements and timeline context to determine impact level and affected department
 */

const { providers, utils } = require('../shared');
const llmProvider = providers.llm;
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
    this.initialized = false;
    this.llm = null;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      if (this.initialized) {
        return { success: true, message: 'Agent already initialized' };
      }

      // Initialize LLM provider using shared module
      this.llm = llmProvider.createLLM('gemini', {
        model: this.config.llm.model,
        temperature: this.config.llm.temperature,
        maxOutputTokens: this.config.llm.maxTokens
      });
      
      this.initialized = true;
      console.log('✅ Impact Assessment Agent initialized successfully');
      return { success: true, message: 'Impact assessment agent initialized successfully' };
    } catch (error) {
      console.error('❌ Error initializing impact assessment agent:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Analyze impact based on problem statement and timeline context
   * @param {Object} input - Input data containing problemStatement and timelineContext
   * @returns {Object} - Impact assessment result
   */
  async analyzeImpact(input) {
    try {
      // Initialize if needed
      if (!this.initialized) {
        await this.initialize();
      }

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

      // Get LLM response using shared provider with Langfuse tracking
      const response = await llmProvider.generateText(this.llm, prompt, {
        agentName: 'impact-assessment',
        operation: 'analyzeImpact',
        metadata: {
          hasProblemStatement: !!problemStatement,
          hasTimelineContext: !!timelineContext,
          problemLength: problemStatement?.length || 0,
          timelineLength: timelineContext?.length || 0
        },
        tags: ['impact-assessment', 'analysis']
      });

      // Parse and validate the response
      const parsedResponse = this.parseResponse(response);
      
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
          impactAssessments: parsedResponse.data.impactAssessments
        }
      };

    } catch (error) {
      console.error('❌ Error in impact assessment analysis:', error);
      
      // If API quota exceeded or service unavailable, provide a fallback response
      if (error.message && (
        error.message.includes('quota') || 
        error.message.includes('overloaded') ||
        error.message.includes('503') ||
        error.message.includes('Service Unavailable')
      )) {
        console.log('⚠️ API service unavailable or overloaded, using fallback assessment');
        return this.generateFallbackAssessment(input);
      }
      
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
1. Generate THREE different impact assessments from different perspectives:
   - First assessment: Focus on technical/operational impact
   - Second assessment: Focus on business/revenue impact  
   - Third assessment: Focus on user experience/customer impact
2. For each assessment, consider factors like:
   - Number of users affected
   - Business function disruption
   - Revenue impact
   - Customer experience impact
   - System availability
   - Data integrity concerns
   - Security implications
3. Determine the most appropriate impact level for each perspective
4. Identify the primary affected department for each assessment
5. Provide confidence level (0-100%) for each
6. Explain reasoning for each assessment
7. Provide specific recommendations for each perspective

RESPONSE FORMAT (JSON):
{
  "impactAssessments": [
    {
      "impactAssessment": "Technical/operational impact assessment focusing on system availability and infrastructure",
      "impactLevel": "One of the available impact levels",
      "department": "One of the available departments",
      "confidence": 85,
      "reasoning": "Explanation of why this impact level and department were selected from technical perspective",
      "recommendations": ["Technical recommendation 1", "Technical recommendation 2", "Technical recommendation 3"]
    },
    {
      "impactAssessment": "Business/revenue impact assessment focusing on financial implications and business continuity",
      "impactLevel": "One of the available impact levels", 
      "department": "One of the available departments",
      "confidence": 80,
      "reasoning": "Explanation of why this impact level and department were selected from business perspective",
      "recommendations": ["Business recommendation 1", "Business recommendation 2", "Business recommendation 3"]
    },
    {
      "impactAssessment": "User experience/customer impact assessment focusing on end-user effects and customer satisfaction",
      "impactLevel": "One of the available impact levels",
      "department": "One of the available departments", 
      "confidence": 90,
      "reasoning": "Explanation of why this impact level and department were selected from user perspective",
      "recommendations": ["User recommendation 1", "User recommendation 2", "User recommendation 3"]
    }
  ]
}

IMPORTANT: 
- Respond ONLY with valid JSON
- Use exact impact level and department names from the lists above
- Confidence should be a number between 0-100 for each assessment
- Provide specific, actionable recommendations for each perspective
- Consider both immediate and long-term impacts
- Each assessment should have a different focus but be based on the same incident`;
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

      // Validate that we have impactAssessments array
      if (!parsed.impactAssessments || !Array.isArray(parsed.impactAssessments)) {
        errors.push('impactAssessments is required and must be an array');
      } else if (parsed.impactAssessments.length !== 3) {
        errors.push('impactAssessments must contain exactly 3 assessments');
      } else {
        // Validate each assessment in the array
        parsed.impactAssessments.forEach((assessment, index) => {
          if (!assessment.impactAssessment || typeof assessment.impactAssessment !== 'string') {
            errors.push(`Assessment ${index + 1}: impactAssessment is required and must be a string`);
          }

          if (!assessment.impactLevel || !isValidImpactLevel(assessment.impactLevel)) {
            errors.push(`Assessment ${index + 1}: impactLevel must be one of: ${IMPACT_LEVEL_LIST.join(', ')}`);
          }

          if (!assessment.department || !isValidDepartment(assessment.department)) {
            errors.push(`Assessment ${index + 1}: department must be one of: ${DEPARTMENT_LIST.join(', ')}`);
          }

          if (typeof assessment.confidence !== 'number' || assessment.confidence < 0 || assessment.confidence > 100) {
            errors.push(`Assessment ${index + 1}: confidence must be a number between 0 and 100`);
          }

          if (!assessment.reasoning || typeof assessment.reasoning !== 'string') {
            errors.push(`Assessment ${index + 1}: reasoning is required and must be a string`);
          }

          if (!Array.isArray(assessment.recommendations) || assessment.recommendations.length === 0) {
            errors.push(`Assessment ${index + 1}: recommendations must be a non-empty array`);
          }
        });
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors: errors
        };
      }

      // Process and clean each assessment
      const processedAssessments = parsed.impactAssessments.map((assessment, index) => ({
        impactAssessment: assessment.impactAssessment.trim(),
        impactLevel: assessment.impactLevel,
        department: assessment.department,
        confidence: Math.round(assessment.confidence),
        reasoning: assessment.reasoning.trim(),
        recommendations: assessment.recommendations.map(rec => rec.trim()).filter(rec => rec.length > 0)
      }));

      return {
        success: true,
        data: {
          impactAssessments: processedAssessments
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
    
    // Generate 3 different fallback assessments
    const fallbackAssessments = [
      {
        impactAssessment: `Technical Impact: Based on keyword analysis, this appears to be a ${impactLevel.toLowerCase()} technical issue affecting ${department.toLowerCase()}. System infrastructure and operational capabilities are impacted.`,
        impactLevel: impactLevel,
        department: DEPARTMENTS.IT_OPERATIONS,
        confidence: confidence,
        reasoning: `Fallback technical assessment based on keyword analysis due to API quota limitations. Focused on system availability and infrastructure impact.`,
        recommendations: [
          "Contact API provider to increase quota limits",
          "Implement proper monitoring and alerting",
          "Review system architecture for single points of failure"
        ]
      },
      {
        impactAssessment: `Business Impact: This ${impactLevel.toLowerCase()} issue affects business operations and revenue generation. Customer transactions and business processes are disrupted.`,
        impactLevel: impactLevel,
        department: department,
        confidence: confidence - 5,
        reasoning: `Fallback business assessment based on keyword analysis due to API quota limitations. Focused on revenue and business continuity impact.`,
        recommendations: [
          "Assess revenue impact and customer satisfaction",
          "Implement business continuity planning",
          "Consider upgrading to paid API plan for production use"
        ]
      },
      {
        impactAssessment: `User Experience Impact: This issue significantly affects end-user experience and customer satisfaction. Users are experiencing service disruptions and degraded performance.`,
        impactLevel: impactLevel,
        department: DEPARTMENTS.CUSTOMER_SUPPORT,
        confidence: confidence - 10,
        reasoning: `Fallback user experience assessment based on keyword analysis due to API quota limitations. Focused on customer impact and user satisfaction.`,
        recommendations: [
          "Monitor customer feedback and support tickets",
          "Implement user communication strategies",
          "Document lessons learned for future incidents"
        ]
      }
    ];
    
    return {
      success: true,
      data: {
        impactAssessments: fallbackAssessments
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
