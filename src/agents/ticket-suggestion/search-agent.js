/**
 * Ticket Suggestion Search Agent
 * Dedicated agent for generating ticket resolution suggestions
 */

const { providers, utils } = require('../shared');
const config = require('./config');

// Extract specific functions from organized modules
const { createLLM } = providers.llm;
const { createSuccessResponse, createErrorResponse, createHealthResponse } = utils.responseFormatting;

// Module-level state
let llm = null;
let initialized = false;

/**
 * Initialize the ticket suggestion search agent
 */
async function initialize() {
    if (initialized) return;
    
    try {
        console.log('🚀 Initializing Ticket Suggestion Search Agent...');
        
        // Create LLM provider using shared utilities
        llm = createLLM('gemini', { temperature: 0.1 }); // Low temperature for consistent responses
        
        initialized = true;
        console.log('✅ Ticket Suggestion Search Agent initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize ticket suggestion search agent:', error);
        throw error;
    }
}

/**
 * Generate ticket resolution suggestions based on similar tickets
 */
async function generateTicketSuggestions(similarTickets, currentTicket = null) {
    try {
        if (!similarTickets || similarTickets.length === 0) {
            throw new Error('No similar tickets provided');
        }
        
        // Initialize if needed
        if (!initialized) {
            await initialize();
        }
        
        // Double-check LLM is available after initialization
        if (!llm) {
            throw new Error('LLM failed to initialize');
        }
        
        const prompt = createSuggestionsPrompt(similarTickets, currentTicket);
        const response = await providers.llm.generateText(llm, prompt, {
            agentName: 'ticket-suggestion',
            operation: 'generateSuggestions',
            metadata: {
                ticketId: currentTicket?.id || 'unknown',
                category: currentTicket?.category,
                similarTicketsCount: similarTickets?.length || 0
            },
            tags: ['ticket-suggestion', 'generation', currentTicket?.category?.toLowerCase()]
        });
        
        // Parse the response to extract suggestions
        const suggestions = parseSuggestionsResponse(response);
        
        return suggestions;
    } catch (error) {
        console.error('❌ Error generating ticket suggestions:', error);
        throw error;
    }
}

/**
 * Create prompt for generating ticket suggestions
 */
function createSuggestionsPrompt(similarTickets, currentTicket = null) {
    let currentTicketInfo = '';
    if (currentTicket) {
        const description = currentTicket.description || currentTicket.short_description;
        currentTicketInfo = `
Current Ticket to Resolve:
- Ticket ID: ${currentTicket.ticket_id}
- Short Description: ${currentTicket.short_description}
- Description: ${description}
- Category: ${currentTicket.category}
- Status: ${currentTicket.status}
- Priority: ${currentTicket.priority}
- Impact: ${currentTicket.impact}
- Urgency: ${currentTicket.urgency}

`;
    }

    const ticketsInfo = similarTickets.map((ticket, index) => {
        const description = ticket.description || ticket.short_description;
        return `
${index + 1}. Ticket ID: ${ticket.ticket_id}
   - Short Description: ${ticket.short_description}
   - Description: ${description}
   - Category: ${ticket.category}
   - Status: ${ticket.status}
   - Priority: ${ticket.priority}
   - Confidence: ${ticket.confidence_percentage}%
`;
    }).join('\n');

    return `You are an expert IT support analyst. Based on the following similar tickets, provide 3 concise resolution suggestions for the current ticket.

${currentTicketInfo}Similar Tickets (for reference):
${ticketsInfo}

Please provide exactly 3 resolution suggestions. Each suggestion should be:
- Concise (1-2 sentences)
- Actionable and specific
- Based on common patterns from the similar tickets
- Focused on the most likely solutions for the current ticket

Format your response as:
1. [First suggestion]
2. [Second suggestion] 
3. [Third suggestion]

Focus on the most common and effective resolution approaches based on the similar ticket data provided.`;
}

/**
 * Parse LLM response to extract suggestions
 */
function parseSuggestionsResponse(responseText) {
    try {
        const suggestions = [];
        const lines = responseText.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            // Look for numbered suggestions (1., 2., 3.)
            const match = line.match(/^\d+\.\s*(.+)$/);
            if (match) {
                suggestions.push({
                    id: suggestions.length + 1,
                    suggestion: match[1].trim(),
                    confidence: 'high' // Based on similar ticket analysis
                });
            }
        }
        
        // Ensure we have exactly 3 suggestions
        if (suggestions.length === 0) {
            // Fallback: split by common patterns
            const fallbackSuggestions = responseText
                .split(/[1-3]\./)
                .filter(s => s.trim())
                .slice(0, 3)
                .map((s, index) => ({
                    id: index + 1,
                    suggestion: s.trim(),
                    confidence: 'medium'
                }));
            
            return fallbackSuggestions;
        }
        
        return suggestions.slice(0, 3); // Limit to 3 suggestions
    } catch (error) {
        console.error('❌ Error parsing suggestions response:', error);
        // Return fallback suggestions
        return [
            {
                id: 1,
                suggestion: "Check network connectivity and email server status",
                confidence: 'low'
            },
            {
                id: 2,
                suggestion: "Verify email client configuration and credentials",
                confidence: 'low'
            },
            {
                id: 3,
                suggestion: "Contact IT support for advanced troubleshooting",
                confidence: 'low'
            }
        ];
    }
}

/**
 * Health check for the ticket suggestion search agent
 */
async function healthCheck() {
    try {
        if (!initialized) {
            await initialize();
        }
        
        // Test LLM availability
        if (!llm) {
            return createHealthResponse('unhealthy', {
                error: 'LLM not initialized'
            });
        }
        
        return createHealthResponse('healthy', {
            llm: 'healthy',
            agent: 'ticket-suggestion'
        });
    } catch (error) {
        return createHealthResponse('unhealthy', {
            error: error.message
        });
    }
}

/**
 * Get agent capabilities
 */
function getCapabilities() {
    return {
        max_suggestions: config.suggestions.maxSuggestions,
        min_tickets: config.suggestions.minTickets,
        max_tickets: config.suggestions.maxTickets,
        supported_fields: config.validation.supportedFields,
        llm_provider: 'gemini',
        temperature: 0.1
    };
}

/**
 * Validate input tickets
 */
function validateInputTickets(similarTickets) {
    const errors = [];
    
    if (!Array.isArray(similarTickets)) {
        errors.push('Similar tickets must be an array');
        return { isValid: false, errors };
    }
    
    if (similarTickets.length < config.suggestions.minTickets) {
        errors.push(`At least ${config.suggestions.minTickets} similar ticket(s) required`);
    }
    
    if (similarTickets.length > config.suggestions.maxTickets) {
        errors.push(`Maximum ${config.suggestions.maxTickets} similar tickets allowed`);
    }
    
    // Validate each ticket
    similarTickets.forEach((ticket, index) => {
        const requiredFields = config.validation.requiredFields;
        requiredFields.forEach(field => {
            if (!ticket[field]) {
                errors.push(`Ticket ${index + 1}: ${field} is required`);
            }
        });
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    initialize,
    generateTicketSuggestions,
    healthCheck,
    getCapabilities,
    validateInputTickets
};
