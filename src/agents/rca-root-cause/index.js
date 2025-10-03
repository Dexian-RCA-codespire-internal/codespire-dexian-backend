/**
 * Root Cause Analysis RAG Agent
 * Analyzes tickets to identify potential root causes with supporting evidence
 */

const {
    providers: { llm: llmProvider },
    utils: { validation, textProcessing, responseFormatting },
    config: defaultConfig
} = require('../shared');

/**
 * Root Cause Analysis Agent Configuration
 */
const RCA_CONFIG = defaultConfig.createRAGAgentConfig('rca-root-cause', {
    // Custom configuration for root cause analysis
    textProcessing: {
        fieldWeights: {
            description: 0.4,
            enhanced_problem: 0.3,
            short_description: 0.2,
            category: 0.1
        }
    },
    
    validation: {
        requiredFields: ['category', 'description', 'short_description'],
        textFields: {
            short_description: { min: 5, max: 500 },
            description: { min: 10, max: 2000 }
        }
    }
});

/**
 * Create Root Cause Analysis prompt
 * @param {Object} currentTicket - The ticket to analyze
 * @param {Array} similarTickets - Array of similar tickets for context
 * @returns {string} Analysis prompt
 */
function createRootCausePrompt(currentTicket, similarTickets) {
    const similarTicketsText = similarTickets.map(ticket => 
        `- Ticket ID: ${ticket.id}
  Category: ${ticket.category}
  Description: ${ticket.short_description}
  Details: ${ticket.description}
  Priority: ${ticket.priority}`
    ).join('\n\n');

    const ticketIds = similarTickets.map(t => t.id).join(', ');

    return `You are an expert system administrator and incident analyst. Your task is to analyze the current ticket and identify the most likely root causes based on the symptoms described and similar historical tickets.

CURRENT TICKET ANALYSIS:
Category: ${currentTicket.category}
Priority: ${currentTicket.priority}
Short Description: ${currentTicket.short_description}
Detailed Description: ${currentTicket.description}
${currentTicket.enhanced_problem ? `Enhanced Problem Statement: ${currentTicket.enhanced_problem}` : ''}
${currentTicket.impact ? `Impact: ${Array.isArray(currentTicket.impact) ? currentTicket.impact.join(', ') : currentTicket.impact}` : ''}

RELATED TICKETS FOR CONTEXT:
${similarTicketsText}

ANALYSIS INSTRUCTIONS:
1. Analyze the symptoms and patterns described in the current ticket
2. Consider the historical context from similar tickets
3. Identify 1-2 most likely root causes based on technical analysis
4. For each root cause, provide detailed analysis (30-100 words)
5. CRITICAL: When your root cause analysis is based on patterns from the similar tickets provided (${ticketIds}), you MUST use the exact ticket ID as the evidence source. This directly shows which historical incident supports your analysis and increases confidence.
6. Assign confidence percentages - higher confidence when evidence comes from provided similar tickets
7. For evidences, do not provide more than 15 words per finding

RESPONSE FORMAT (JSON only, no additional text):
[
  {
    "id": 1,
    "rootCause": "Specific technical root cause title",
    "analysis": "Detailed technical explanation of why this root cause would create the observed symptoms (30-100 words)",
    "confidence": 85,
    "evidence": [
      {
        "type": "Evidence category (e.g., Historical Pattern, Similar Incident Analysis, Configuration Review)",
        "finding": "Specific evidence that supports this root cause",
        "source": "${similarTickets[0]?.id || 'AI-generated'}"  // Use ticket ID if based on similar ticket pattern
      }
    ]
  }
]

EVIDENCE SOURCE GUIDELINES:
- MANDATORY: When your root cause analysis is based on patterns from similar tickets, use the exact ticket ID as source
- Example: If you identify "Database Connection Pool Exhaustion" as a root cause because it matches a pattern from ticket "INC-2024-1234", then use "INC-2024-1234" as the evidence source
- Higher confidence scores should be given when evidence comes from provided similar tickets
- This creates direct traceability between your analysis and historical incidents

Focus on technical root causes like:
- Configuration errors or changes
- Capacity/resource exhaustion issues
- Software bugs or memory leaks
- Network connectivity problems
- Hardware failures or degradation
- Security-related issues
- Database performance problems
- Service dependencies failures

EXAMPLE OUTPUT (if similar ticket "INC-2024-1234" involved database connection issues):
[
  {
    "id": 1,
    "rootCause": "Database Connection Pool Exhaustion",
    "analysis": "Application database connection pool reached maximum capacity during peak traffic, causing timeout errors and cascading service failures similar to historical incident patterns.",
    "confidence": 92,
    "evidence": [
      {
        "type": "Historical Pattern Analysis",
        "finding": "Similar connection pool exhaustion symptoms and resolution pattern identified",
        "source": "INC-2024-1234"
      },
      {
        "type": "Performance Correlation",
        "finding": "Peak traffic timing matches previous incident characteristics",
        "source": "INC-2024-1234"
      }
    ]
  }
]

Provide realistic, actionable root causes with direct ticket ID references if available else use generic identifiers for maximum accuracy and traceability.`;
}

/**
 * Analyze ticket for root causes
 * @param {Object} currentTicket - Current ticket to analyze
 * @param {Array} similarTickets - Similar tickets for context
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results with root causes
 */
async function analyzeRootCauses(currentTicket, similarTickets = [], options = {}) {
    try {
        // Ensure impact is always an array for consistent processing
        if (currentTicket && currentTicket.impact) {
            if (!Array.isArray(currentTicket.impact)) {
                currentTicket.impact = [currentTicket.impact];
            }
        } else if (currentTicket) {
            currentTicket.impact = [];
        }

        // Validate input
        const validation = validateInput(currentTicket, similarTickets);
        if (!validation.isValid) {
            throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
        }

        // Create LLM instance
        const llm = llmProvider.createLLM('gemini', {
            temperature: 0.2, // Low temperature for more consistent analysis
            maxOutputTokens: 4096
        });

        // Generate analysis prompt
        const prompt = createRootCausePrompt(currentTicket, similarTickets);

        // Get LLM analysis with Langfuse tracking
        console.log('🔍 Analyzing root causes...');
        const response = await llmProvider.generateText(llm, prompt, {
            agentName: 'rca-root-cause',
            operation: 'analyzeRootCauses',
            metadata: {
                ticketId: currentTicket.id || 'unknown',
                category: currentTicket.category,
                similarTicketsCount: similarTickets.length
            },
            tags: ['root-cause-analysis', currentTicket.category?.toLowerCase()],
            session: options.session // Pass through if provided
        });

        // Parse JSON response
        let rootCauses;
        try {
            // Clean the response to ensure it's valid JSON
            const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            rootCauses = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Failed to parse LLM response as JSON:', parseError);
            throw new Error('Invalid JSON response from analysis');
        }

        // Validate and format results
        const formattedResults = formatRootCauseResults(rootCauses, currentTicket, similarTickets);

        console.log(`✅ Root cause analysis completed. Found ${formattedResults.results.length} potential causes.`);

        return responseFormatting.createSuccessResponse(
            formattedResults,
            'Root cause analysis completed successfully',
            {
                analyzed_ticket_id: currentTicket.id || 'current',
                similar_tickets_count: similarTickets.length,
                processing_timestamp: new Date().toISOString()
            }
        );

    } catch (error) {
        console.error('❌ Error in root cause analysis:', error);
        return responseFormatting.createErrorResponse(
            'Root cause analysis failed',
            { error: error.message },
            500
        );
    }
}

/**
 * Validate input data for root cause analysis
 * @param {Object} currentTicket - Current ticket
 * @param {Array} similarTickets - Similar tickets
 * @returns {Object} Validation result
 */
function validateInput(currentTicket, similarTickets) {
    const errors = [];

    // Validate current ticket
    if (!currentTicket) {
        errors.push('Current ticket is required');
    } else {
        const ticketValidation = validation.validateSchema(currentTicket, RCA_CONFIG.validation);
        if (!ticketValidation.isValid) {
            errors.push(`Current ticket validation: ${ticketValidation.errors.join(', ')}`);
        }
    }

    // Validate similar tickets array
    if (!Array.isArray(similarTickets)) {
        errors.push('Similar tickets must be an array');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Format and validate root cause analysis results
 * @param {Array} rootCauses - Raw root causes from LLM
 * @param {Object} currentTicket - Current ticket context
 * @param {Array} similarTickets - Similar tickets context
 * @returns {Object} Formatted results
 */
function formatRootCauseResults(rootCauses, currentTicket, similarTickets) {
    if (!Array.isArray(rootCauses)) {
        throw new Error('Root causes must be an array');
    }

    const similarTicketIds = similarTickets.map(t => t.id);

    const formattedResults = rootCauses.map((cause, index) => {
        // Ensure required fields exist
        const formattedCause = {
            id: cause.id || index + 1,
            rootCause: cause.rootCause || 'Unknown Root Cause',
            analysis: cause.analysis || 'No analysis provided',
            confidence: Math.min(Math.max(cause.confidence || 50, 0), 100), // Clamp between 0-100
            evidence: Array.isArray(cause.evidence) ? cause.evidence : []
        };

        // Validate evidence format - prioritize ticket ID sources for accuracy
        formattedCause.evidence = formattedCause.evidence.map((evidence) => {
            return {
                type: evidence.type || 'General Analysis',
                finding: evidence.finding || 'No finding specified', 
                source: evidence.source || 'Unknown Source'
            };
        });

        return formattedCause;
    });

    // Sort by confidence score (highest first)
    formattedResults.sort((a, b) => b.confidence - a.confidence);

    return {
        results: formattedResults,
        analysis_metadata: {
            total_root_causes: formattedResults.length,
            highest_confidence: formattedResults[0]?.confidence || 0,
            average_confidence: formattedResults.length > 0 
                ? Math.round(formattedResults.reduce((sum, cause) => sum + cause.confidence, 0) / formattedResults.length)
                : 0,
            ticket_category: currentTicket.category,
            similar_tickets_analyzed: similarTickets.length,
            referenced_tickets: similarTicketIds
        }
    };
}

/**
 * Get agent capabilities and health status
 * @returns {Object} Agent capabilities
 */
function getCapabilities() {
    return {
        name: 'Root Cause Analysis Agent',
        version: '1.0.0',
        description: 'Analyzes tickets to identify potential root causes with supporting evidence',
        capabilities: [
            'Root cause identification',
            'Historical pattern analysis',
            'Evidence correlation',
            'Confidence scoring',
            'Technical impact assessment'
        ],
        supported_categories: [
            'Network Infrastructure',
            'Database',
            'API Gateway',
            'Application Performance',
            'Security',
            'Configuration Management'
        ],
        input_requirements: {
            current_ticket: ['category', 'description', 'short_description'],
            similar_tickets: 'Array of historical tickets (optional)'
        },
        output_format: {
            results: 'Array of root causes with evidence and confidence scores',
            metadata: 'Analysis statistics and context'
        }
    };
}

module.exports = {
    analyzeRootCauses,
    getCapabilities,
    RCA_CONFIG
};