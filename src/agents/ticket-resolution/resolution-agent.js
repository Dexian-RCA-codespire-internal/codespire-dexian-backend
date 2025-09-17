/**
 * Ticket Resolution Agent
 * Handles ticket resolution analysis and RCA processing
 */

const { providers, utils } = require('../shared');
const llmProvider = providers.llm;
const config = require('./config');
const { servicenow } = require('../../constants');

class TicketResolutionAgent {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the resolution agent
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Ticket Resolution Agent...');
            
            // Create LLM instance
            this.llm = llmProvider.createLLM('gemini', {
                model: config.llm.model,
                temperature: config.llm.temperature,
                maxOutputTokens: config.llm.maxTokens
            });
            
            this.initialized = true;
            console.log('✅ Ticket Resolution Agent initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Ticket Resolution Agent:', error);
            throw error;
        }
    }

    /**
     * Analyze ticket and root cause to determine close code and generate customer summary
     */
    async analyzeTicketResolution(ticket, rootCause) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Extract problem statement from ticket
            const problemStatement = this.extractProblemStatement(ticket);
            
            // Generate analysis prompt
            const prompt = this.createResolutionAnalysisPrompt(problemStatement, rootCause);
            
            // Get LLM analysis
            const analysis = await llmProvider.generateText(this.llm, prompt);

            // Parse the response
            const parsedAnalysis = this.parseResolutionAnalysis(analysis);
            
            return {
                success: true,
                data: {
                    problemStatement,
                    rootCause,
                    closeCode: parsedAnalysis.closeCode,
                    customerSummary: parsedAnalysis.customerSummary,
                    analysis: parsedAnalysis.analysis
                }
            };

        } catch (error) {
            console.error('❌ Error in analyzeTicketResolution:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract problem statement from ticket data
     */
    extractProblemStatement(ticket) {
        const parts = [];
        
        if (ticket.short_description) {
            parts.push(`Issue: ${ticket.short_description}`);
        }
        
        if (ticket.description) {
            parts.push(`Description: ${ticket.description}`);
        }
        
        if (ticket.category) {
            parts.push(`Category: ${ticket.category}`);
        }
        
        return parts.join('\n');
    }

    /**
     * Create prompt for resolution analysis
     */
    createResolutionAnalysisPrompt(problemStatement, rootCause) {
        return `
You are an expert IT support analyst. Analyze the following ticket and root cause to determine the appropriate close code and generate a customer-friendly summary.

TICKET INFORMATION:
${problemStatement}

ROOT CAUSE:
${rootCause}

AVAILABLE CLOSE CODES:
${servicenow.getAllCloseCodesWithDescriptions().map(item => `- "${item.code}": ${item.description}`).join('\n')}

Please provide your analysis in the following JSON format:
{
    "closeCode": "one of the available close codes",
    "customerSummary": "A customer-friendly summary of the resolution (50-500 characters)",
    "analysis": "Brief explanation of why this close code was chosen"
}

Guidelines:
1. Choose the most appropriate close code based on the root cause
2. Write the customer summary in simple, non-technical language
3. Keep the customer summary concise but informative
4. The customer summary should explain what was done to resolve the issue
`;
    }

    /**
     * Parse LLM response for resolution analysis
     */
    parseResolutionAnalysis(response) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Validate close code
                const validCloseCodes = Object.values(config.closeCodes);
                if (!validCloseCodes.includes(parsed.closeCode)) {
                    parsed.closeCode = 'Solution provided'; // Default fallback
                }
                
                // Validate customer summary length
                if (parsed.customerSummary && parsed.customerSummary.length > config.response.maxSummaryLength) {
                    parsed.customerSummary = parsed.customerSummary.substring(0, config.response.maxSummaryLength - 3) + '...';
                }
                
                return parsed;
            }
            
            // Fallback parsing if JSON extraction fails
            return this.fallbackParsing(response);
            
        } catch (error) {
            console.error('❌ Error parsing resolution analysis:', error);
            return this.fallbackParsing(response);
        }
    }

    /**
     * Fallback parsing when JSON extraction fails
     */
    fallbackParsing(response) {
        // Simple keyword-based close code detection
        const lowerResponse = response.toLowerCase();
        let closeCode = 'Solution provided'; // Default
        
        if (lowerResponse.includes('duplicate')) {
            closeCode = 'Duplicate';
        } else if (lowerResponse.includes('known error') || lowerResponse.includes('known issue')) {
            closeCode = 'Known error';
        } else if (lowerResponse.includes('user error') || lowerResponse.includes('user mistake')) {
            closeCode = 'User error';
        } else if (lowerResponse.includes('workaround')) {
            closeCode = 'Workaround provided';
        } else if (lowerResponse.includes('resolved by caller')) {
            closeCode = 'Resolved by caller';
        }
        
        // Extract customer summary (first sentence or up to 200 chars)
        const sentences = response.split(/[.!?]/);
        let customerSummary = sentences[0] || 'Issue has been resolved.';
        
        if (customerSummary.length > config.response.maxSummaryLength) {
            customerSummary = customerSummary.substring(0, config.response.maxSummaryLength - 3) + '...';
        }
        
        return {
            closeCode,
            customerSummary,
            analysis: 'Analysis completed using fallback parsing'
        };
    }

    /**
     * Validate ticket input
     */
    validateTicketInput(ticket) {
        const errors = [];
        
        if (!ticket) {
            errors.push('Ticket data is required');
            return { isValid: false, errors };
        }
        
        // Check required fields
        for (const field of config.validation.ticketRequiredFields) {
            if (!ticket[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate root cause input
     */
    validateRootCause(rootCause) {
        const errors = [];
        
        if (!rootCause || typeof rootCause !== 'string') {
            errors.push('Root cause must be a non-empty string');
        } else {
            const length = rootCause.length;
            const limits = config.validation.textLimits.rootCause;
            
            if (length < limits.min) {
                errors.push(`Root cause must be at least ${limits.min} characters`);
            }
            
            if (length > limits.max) {
                errors.push(`Root cause must not exceed ${limits.max} characters`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

}

module.exports = new TicketResolutionAgent();
