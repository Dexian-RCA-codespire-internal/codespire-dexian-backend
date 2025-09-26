/**
 * Solution Generation RAG Agent
 * Generates step-by-step solutions based on similar tickets, current ticket, root causes, and impact data
 */

const {
    providers: { llm: llmProvider },
    utils: { validation, textProcessing, responseFormatting },
    config: defaultConfig
} = require('../shared');

/**
 * Solution Generation Agent Configuration
 */
const SOLUTION_CONFIG = defaultConfig.createRAGAgentConfig('solution-generation', {
    // Custom configuration for solution generation
    textProcessing: {
        fieldWeights: {
            description: 0.25,
            enhanced_problem: 0.25,
            short_description: 0.2,
            category: 0.15,
            impact: 0.1,
            priority: 0.05
        }
    },
    
    validation: {
        requiredFields: ['currentTicket'],
        textFields: {
            'currentTicket.short_description': { min: 5, max: 500 },
            'currentTicket.description': { min: 10, max: 2000 }
        }
    }
});

/**
 * Create solution generation prompt
 * @param {Object} currentTicket - The current ticket requiring solutions
 * @param {Array} similarTickets - Array of similar tickets for reference
 * @param {Array} rootCauses - Array of identified root causes
 * @param {Array} impactData - Array of impact assessments
 * @returns {string} Solution generation prompt
 */
function createSolutionPrompt(currentTicket, similarTickets = [], rootCauses = [], impactData = []) {
    // Format similar tickets
    const similarTicketsText = similarTickets.length > 0 
        ? similarTickets.map(ticket => 
            `- Ticket ID: ${ticket.id}
  Category: ${ticket.category}
  Description: ${ticket.short_description}
  Priority: ${ticket.priority}
  Confidence: ${ticket.confidence_percentage}%`
        ).join('\n\n')
        : "No similar tickets available";

    // Format root causes
    const rootCausesText = rootCauses.length > 0
        ? rootCauses.map(cause => 
            `- Root Cause: ${cause.rootCause}
  Analysis: ${cause.analysis}
  Confidence: ${cause.confidence}%
  Evidence: ${cause.evidence?.map(e => `${e.type}: ${e.finding}`).join('; ') || 'No evidence'}`
        ).join('\n\n')
        : "No root causes identified";

    // Format impact data
    const impactText = impactData.length > 0
        ? impactData.map(impact => 
            `- ${impact.area || impact.type || 'Impact'}: ${impact.description || impact.impact}
  Severity: ${impact.severity || 'Unknown'}`
        ).join('\n\n')
        : Array.isArray(currentTicket.impact) ? currentTicket.impact.join(', ') : (currentTicket.impact || "No impact data");

    return `You are an expert IT solution architect and incident management specialist. Based on the provided ticket information, similar cases, identified root causes, and impact assessments, generate comprehensive step-by-step solutions.

**CURRENT TICKET INFORMATION:**
Category: ${currentTicket.category}
Short Description: ${currentTicket.short_description}
Description: ${currentTicket.description}
Enhanced Problem: ${currentTicket.enhanced_problem || 'N/A'}
Priority: ${currentTicket.priority}
Urgency: ${currentTicket.urgency}
Issue Type: ${currentTicket.issueType || 'N/A'}
Severity: ${currentTicket.severity || 'N/A'}
Business Impact Category: ${currentTicket.businessImpactCategory || 'N/A'}
Impact Level: ${currentTicket.impactLevel || 'N/A'}
Department Affected: ${currentTicket.departmentAffected || 'N/A'}
Problem Statement: ${currentTicket.problemStatement || 'N/A'}
Impact Assessment: ${currentTicket.impactAssessment || 'N/A'}

**SIMILAR TICKETS FOR REFERENCE:**
${similarTicketsText}

**IDENTIFIED ROOT CAUSES:**
${rootCausesText}

**IMPACT ASSESSMENT:**
${impactText}

**TASK:**
Generate comprehensive solutions in JSON format with the following structure:

{
  "solutions": [
    {
      "id": 1,
      "title": "Solution Title",
      "priority": "Critical|High|Medium|Low",
      "category": "Immediate|Short-term|Long-term",
      "timeframe": "Estimated time to complete",
      "confidence": 85,
      "description": "Brief overview of the solution",
      "steps": [
        {
          "step": 1,
          "title": "Step Title",
          "description": "Detailed step description",
          "responsible": "Who should execute this step",
          "duration": "Estimated duration",
          "requirements": ["Required resources/tools"],
          "risks": ["Potential risks or considerations"],
          "validation": "How to verify step completion"
        }
      ],
      "expectedOutcome": "What this solution should achieve",
      "rollbackPlan": "Steps to rollback if solution fails",
      "dependencies": ["Dependencies on other solutions or resources"],
      "riskLevel": "Low|Medium|High|Critical",
      "businessImpact": "Impact on business operations during implementation"
    }
  ],
  "implementationPlan": {
    "recommendedOrder": [1, 2, 3],
    "parallelExecution": [[1, 2], [3]],
    "totalEstimatedTime": "Overall time estimate",
    "resourcesRequired": ["List of required resources"],
    "approvalRequired": true/false,
    "communicationPlan": "Stakeholder communication requirements"
  },
  "preventiveMeasures": [
    {
      "measure": "Preventive action",
      "description": "How this prevents future occurrences",
      "implementation": "How to implement this measure",
      "monitoring": "How to monitor effectiveness"
    }
  ]
}

**GUIDELINES:**
1. Base solutions on the identified root causes and their confidence levels
2. Consider the priority, urgency, and business impact of the current ticket
3. Learn from similar tickets to suggest proven solutions
4. Provide both immediate fixes and long-term preventive measures
5. Include detailed step-by-step instructions for each solution
6. Specify responsible parties, timelines, and validation criteria
7. Consider rollback plans and risk mitigation
8. Ensure solutions are practical and implementable
9. Order solutions by priority and effectiveness
10. Include dependencies between solutions

Generate 1 comprehensive solutions covering long-term approaches.`;
}

/**
 * Parse and validate solution response from LLM
 * @param {string} responseText - Raw LLM response
 * @returns {Object} Parsed and validated solution data
 */
function parseSolutionResponse(responseText) {
    try {
        // Clean the response text
        const cleanedResponse = responseText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        const parsed = JSON.parse(cleanedResponse);

        // Validate the response structure
        if (!parsed.solutions || !Array.isArray(parsed.solutions)) {
            throw new Error('Invalid response structure: missing solutions array');
        }

        // Validate each solution
        parsed.solutions.forEach((solution, index) => {
            if (!solution.title || !solution.steps || !Array.isArray(solution.steps)) {
                throw new Error(`Invalid solution at index ${index}: missing title or steps`);
            }
        });

        // Ensure implementation plan exists
        if (!parsed.implementationPlan) {
            parsed.implementationPlan = {
                recommendedOrder: parsed.solutions.map((_, index) => index + 1),
                totalEstimatedTime: "To be determined",
                resourcesRequired: ["Technical team"],
                approvalRequired: false,
                communicationPlan: "Notify affected stakeholders"
            };
        }

        // Ensure preventive measures exist
        if (!parsed.preventiveMeasures) {
            parsed.preventiveMeasures = [
                {
                    measure: "Regular monitoring and maintenance",
                    description: "Implement regular checks to prevent similar issues",
                    implementation: "Schedule periodic reviews",
                    monitoring: "Track key metrics and alerts"
                }
            ];
        }

        return parsed;

    } catch (error) {
        console.error('Error parsing solution response:', error);
        throw new Error(`Failed to parse solution response: ${error.message}`);
    }
}

/**
 * Generate solutions for a ticket
 * @param {Object} currentTicket - The current ticket requiring solutions
 * @param {Array} similarTickets - Array of similar tickets for reference
 * @param {Array} rootCauses - Array of identified root causes
 * @param {Array} impactData - Array of impact assessments
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Solution generation result
 */
async function generateSolutions(currentTicket, similarTickets = [], rootCauses = [], impactData = [], options = {}) {
    const startTime = Date.now();

    try {
        // Validate input data
        const validation = validateSolutionInput({ currentTicket, similarTickets, rootCauses, impactData });
        if (!validation.isValid) {
            return responseFormatting.createErrorResponse(
                'Invalid input data',
                { validationErrors: validation.errors },
                400
            );
        }

        // Create weighted text for context
        const ticketText = textProcessing.createWeightedText(
            currentTicket,
            SOLUTION_CONFIG.textProcessing.fieldWeights
        );

        // Generate solution prompt
        const prompt = createSolutionPrompt(currentTicket, similarTickets, rootCauses, impactData);

        // Create LLM instance
        const llm = llmProvider.createLLM('gemini', {
            temperature: 0.2, // Lower temperature for more focused solutions
            maxOutputTokens: 4096
        });

        console.log('🤖 Starting solution generation with LLM...');

        // Generate solutions with timeout
        const response = await Promise.race([
            llmProvider.generateText(llm, prompt),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('LLM request timed out after 60 seconds')), 60000)
            )
        ]);

        console.log('✅ LLM response received, length:', response?.length || 0);
        
        // Parse and validate response
        const solutionData = parseSolutionResponse(response);

        // Calculate processing time
        const processingTime = Date.now() - startTime;

        // Return formatted success response
        return responseFormatting.createSuccessResponse(
            {
                solutions: solutionData.solutions,
                implementationPlan: solutionData.implementationPlan,
                preventiveMeasures: solutionData.preventiveMeasures,
                metadata: {
                    totalSolutions: solutionData.solutions.length,
                    similarTicketsUsed: similarTickets.length,
                    rootCausesAnalyzed: rootCauses.length,
                    impactFactorsConsidered: impactData.length,
                    processingTimeMs: processingTime,
                    generatedAt: new Date().toISOString()
                }
            },
            'Solutions generated successfully'
        );

    } catch (error) {
        console.error('Error generating solutions:', error);
        return responseFormatting.createErrorResponse(
            'Failed to generate solutions',
            { error: error.message },
            500
        );
    }
}

/**
 * Validate solution generation input
 * @param {Object} input - Input data to validate
 * @returns {Object} Validation result
 */
function validateSolutionInput(input) {
    const { currentTicket, similarTickets, rootCauses, impactData } = input;
    const errors = [];

    // Validate current ticket
    if (!currentTicket) {
        errors.push('Current ticket is required');
    } else {
        if (!currentTicket.short_description && !currentTicket.description) {
            errors.push('Current ticket must have either short_description or description');
        }
        if (!currentTicket.category) {
            errors.push('Current ticket category is required');
        }
    }

    // Validate arrays
    if (similarTickets && !Array.isArray(similarTickets)) {
        errors.push('Similar tickets must be an array');
    }
    if (rootCauses && !Array.isArray(rootCauses)) {
        errors.push('Root causes must be an array');
    }
    if (impactData && !Array.isArray(impactData)) {
        errors.push('Impact data must be an array');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get agent health status
 * @returns {Promise<Object>} Health status
 */
async function getHealth() {
    try {
        const llm = llmProvider.createLLM('gemini');
        
        // Test LLM connectivity with a simple prompt
        const testResponse = await llmProvider.generateText(llm, 'Respond with "OK" if you are working correctly.');
        
        return responseFormatting.createHealthResponse('healthy', {
            llm: testResponse.includes('OK') ? 'healthy' : 'degraded',
            config: 'healthy'
        });
    } catch (error) {
        return responseFormatting.createHealthResponse('unhealthy', {
            llm: 'unhealthy',
            error: error.message
        });
    }
}

/**
 * Get agent capabilities
 * @returns {Object} Agent capabilities
 */
function getCapabilities() {
    return {
        name: 'Solution Generation RAG Agent',
        version: '1.0.0',
        description: 'Generates comprehensive step-by-step solutions based on ticket analysis',
        capabilities: [
            'Multi-step solution generation',
            'Implementation planning',
            'Risk assessment',
            'Rollback planning',
            'Preventive measures',
            'Resource estimation',
            'Timeline planning'
        ],
        supportedInputs: [
            'currentTicket (required)',
            'similarTickets (optional)',
            'rootCauses (optional)',
            'impactData (optional)'
        ],
        outputFormat: 'Structured JSON with solutions, implementation plan, and preventive measures',
        llmProvider: SOLUTION_CONFIG.providers.llm,
        embeddingProvider: SOLUTION_CONFIG.providers.embedding
    };
}

module.exports = {
    generateSolutions,
    getHealth,
    getCapabilities,
    validateSolutionInput,
    SOLUTION_CONFIG
};