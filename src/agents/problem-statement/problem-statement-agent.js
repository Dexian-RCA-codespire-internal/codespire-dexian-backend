/**
 * Problem Statement Agent
 * Core agent for generating problem statements from ticket data and server logs
 */

const { providers, utils } = require('../shared');
const config = require('./config');
const { 
    ISSUE_TYPES, 
    SEVERITY_LEVELS, 
    BUSINESS_IMPACT_CATEGORIES,
    ISSUE_TYPE_LIST,
    SEVERITY_LEVEL_LIST,
    BUSINESS_IMPACT_CATEGORY_LIST
} = require('../../constants/servicenow');
const { ConnectContactLens } = require('aws-sdk');

class ProblemStatementAgent {
    constructor() {
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

            // Initialize LLM provider
            this.llm = providers.llm.createLLM(config.llm.provider);
            
            this.initialized = true;
            return { success: true, message: 'Problem statement agent initialized successfully' };
        } catch (error) {
            console.error('❌ Error initializing problem statement agent:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Generate problem statement from input data
     */
    async generateProblemStatement(inputData) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const startTime = Date.now();
            
            // Validate input
            const validation = this.validateInput(inputData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors
                };
            }

            // Prepare context for LLM
            const context = this.prepareContext(inputData);
            
            // Generate problem statement using LLM
            const result = await this.generateWithLLM(context);
            
            const processingTime = Date.now() - startTime;
            
            return {
                success: true,
                data: {
                    problemDefinitions: result.problemDefinitions,
                    question: result.question,
                    issueType: result.issueType,
                    severity: result.severity,
                    businessImpact: result.businessImpact,
                    confidence: result.confidence,
                    processingTimeMs: processingTime,
                    generatedAt: new Date().toISOString()
                },
                metadata: {
                    inputData: {
                        hasDescription: !!inputData.description,
                        hasServerLogs: inputData.serverLogs && inputData.serverLogs.length > 0,
                        logCount: inputData.serverLogs ? inputData.serverLogs.length : 0
                    },
                    config: {
                        maxWordCount: config.problemStatement.maxWordCount,
                        minWordCount: config.problemStatement.minWordCount,
                        llmProvider: config.llm.provider
                    }
                }
            };

        } catch (error) {
            console.error('❌ Error generating problem statement:', error);
            return {
                success: false,
                error: 'Failed to generate problem statement',
                message: error.message
            };
        }
    }

    /**
     * Validate input data
     */
    validateInput(inputData) {
        const errors = [];

        // Check required fields
        if (!inputData.shortDescription || typeof inputData.shortDescription !== 'string') {
            errors.push('shortDescription is required and must be a string');
        }

        // Validate short description length
        if (inputData.shortDescription && inputData.shortDescription.length > config.validation.maxDescriptionLength) {
            errors.push(`shortDescription must not exceed ${config.validation.maxDescriptionLength} characters`);
        }

        // Validate optional description
        if (inputData.description && typeof inputData.description !== 'string') {
            errors.push('description must be a string if provided');
        }

        if (inputData.description && inputData.description.length > config.validation.maxDescriptionLength) {
            errors.push(`description must not exceed ${config.validation.maxDescriptionLength} characters`);
        }

        // Validate server logs
        if (inputData.serverLogs) {
            if (!Array.isArray(inputData.serverLogs)) {
                errors.push('serverLogs must be an array if provided');
            } else {
                if (inputData.serverLogs.length > config.validation.maxLogEntries) {
                    errors.push(`serverLogs must not exceed ${config.validation.maxLogEntries} entries`);
                }

                // Validate each log entry
                inputData.serverLogs.forEach((log, index) => {
                    if (!log.time || !log.service || !log.level || !log.message) {
                        errors.push(`serverLogs[${index}] must have time, service, level, and message properties`);
                    }

                    if (log.message && log.message.length > config.validation.maxLogMessageLength) {
                        errors.push(`serverLogs[${index}].message must not exceed ${config.validation.maxLogMessageLength} characters`);
                    }
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Prepare context for LLM generation
     */
    prepareContext(inputData) {
        const context = {
            shortDescription: inputData.shortDescription,
            description: inputData.description || '',
            serverLogs: inputData.serverLogs || [],
            availableIssueTypes: ISSUE_TYPE_LIST,
            availableSeverityLevels: SEVERITY_LEVEL_LIST,
            availableBusinessImpactCategories: BUSINESS_IMPACT_CATEGORY_LIST,
            wordCountRequirements: {
                min: config.problemStatement.minWordCount,
                max: config.problemStatement.maxWordCount
            }
        };

        return context;
    }

    /**
     * Generate problem statement using LLM
     */
    async generateWithLLM(context) {
        const prompt = this.buildPrompt(context);
        
        try {
            const response = await providers.llm.generateText(this.llm, prompt, {
                agentName: 'problem-statement',
                operation: 'generateProblemStatement',
                metadata: {
                    hasDescription: !!context.description,
                    hasServerLogs: context.serverLogs.length > 0,
                    logCount: context.serverLogs.length
                },
                tags: ['problem-statement', 'generation']
            });

            return this.parseLLMResponse(response);
        } catch (error) {
            console.error('❌ Error in LLM generation:', error);
            
            // Fallback to default values if enabled
            if (config.errorHandling.fallbackToDefault) {
                return this.getDefaultResponse(context);
            }
            
            throw error;
        }
    }

    /**
     * Build prompt for LLM
     */
    buildPrompt(context) {
        const serverLogsText = context.serverLogs.length > 0 
            ? `\n\nServer Logs:\n${context.serverLogs.map(log => 
                `[${log.time}] ${log.service} [${log.level}]: ${log.message}`
              ).join('\n')}`
            : '';

        return `You are an expert IT problem analyst. Generate a comprehensive problem statement based on the following information:

Short Description: ${context.shortDescription}
${context.description ? `Additional Description: ${context.description}` : ''}${serverLogsText}

Requirements:
1. Generate THREE different problem definitions (30-50 words each) that clearly describe the issue from different perspectives
2. Generate ONE specific, targeted question (MAXIMUM 30 words) that directly relates to this exact problem (NOT a generic question like "What happened?" or "Describe the symptoms")
3. Determine the issue type from: ${context.availableIssueTypes.join(', ')}
4. Determine the severity level from: ${context.availableSeverityLevels.join(', ')}
5. Determine the business impact category from: ${context.availableBusinessImpactCategories.join(', ')}

Respond ONLY with valid JSON in the following exact format (no additional text, explanations, or markdown):
{
  "problemDefinitions": [
    "First problem definition (30-50 words) - focus on technical aspects",
    "Second problem definition (30-50 words) - focus on business impact", 
    "Third problem definition (30-50 words) - focus on user experience"
  ],
  "question": "One specific, concise question (max 30 words) directly related to this exact problem",
  "issueType": "One of the available issue types",
  "severity": "One of the available severity levels", 
  "businessImpact": "One of the available business impact categories",
  "confidence": 0.85
}

IMPORTANT: 
- Return ONLY the JSON object, no markdown formatting
- Ensure all strings are properly quoted
- No trailing commas
- Valid JSON syntax only

Focus on:
- Technical accuracy based on the information provided
- Appropriate severity assessment
- Realistic business impact evaluation
- Clear, actionable problem definitions from multiple angles
- SPECIFIC, CONCISE question (max 30 words) that targets the root cause, investigation path, or solution approach
- AVOID generic questions - make the question contextually relevant to the specific issue described`;
    }

    /**
     * Parse LLM response
     */
    parseLLMResponse(response) {
        try {
            
            // Clean the response first
            let cleanedResponse = response.trim();
            
            // Try to find JSON object boundaries more robustly
            const jsonStart = cleanedResponse.indexOf('{');
            const jsonEnd = cleanedResponse.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
                throw new Error('No valid JSON object found in LLM response');
            }
            
            // Extract the JSON part
            let jsonString = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            
            // Try to fix common JSON issues
            jsonString = this.fixCommonJSONIssues(jsonString);
            
            const parsed = JSON.parse(jsonString);
            
            // Validate parsed response
            const validation = this.validateLLMResponse(parsed);
            if (!validation.isValid) {
                throw new Error(`Invalid LLM response: ${validation.errors.join(', ')}`);
            }

            return parsed;
        } catch (error) {
            console.error('❌ Error parsing LLM response:', error);
            console.error('❌ Raw response was:', response);
            
            // Try fallback parsing with more aggressive cleaning
            try {
                const fallbackParsed = this.fallbackJSONParse(response);
                if (fallbackParsed) {
                    console.log('✅ Fallback parsing succeeded');
                    return fallbackParsed;
                }
            } catch (fallbackError) {
                console.error('❌ Fallback parsing also failed:', fallbackError);
            }
            
            throw new Error(`Failed to parse LLM response: ${error.message}`);
        }
    }

    /**
     * Fix common JSON issues in LLM responses
     */
    fixCommonJSONIssues(jsonString) {
        // Remove control characters that cause JSON parsing issues FIRST
        jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, '');
        
        // Remove any trailing commas before closing brackets/braces
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unescaped quotes in strings
        jsonString = jsonString.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
        
        // Fix single quotes to double quotes
        jsonString = jsonString.replace(/'/g, '"');
        
        // Fix missing quotes around object keys
        jsonString = jsonString.replace(/(\w+):/g, '"$1":');
        
        // Fix boolean values
        jsonString = jsonString.replace(/:\s*true\b/g, ': true');
        jsonString = jsonString.replace(/:\s*false\b/g, ': false');
        jsonString = jsonString.replace(/:\s*null\b/g, ': null');
        
        // Clean up any remaining control characters
        jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, '');
        
        return jsonString;
    }

    /**
     * Fallback JSON parsing with more aggressive cleaning
     */
    fallbackJSONParse(response) {
        try {
            console.log('🔄 Attempting fallback JSON parsing...');
            
            // Try to extract just the essential parts and reconstruct
            const problemDefsMatch = response.match(/"problemDefinitions"\s*:\s*\[(.*?)\]/s);
            const questionMatch = response.match(/"question"\s*:\s*"([^"]+)"/);
            const issueTypeMatch = response.match(/"issueType"\s*:\s*"([^"]+)"/);
            const severityMatch = response.match(/"severity"\s*:\s*"([^"]+)"/);
            const businessImpactMatch = response.match(/"businessImpact"\s*:\s*"([^"]+)"/);
            const confidenceMatch = response.match(/"confidence"\s*:\s*(\d+\.?\d*)/);
            
            
            if (!problemDefsMatch || !questionMatch || !issueTypeMatch || !severityMatch || !businessImpactMatch) {
                console.log('❌ Missing required fields for fallback parsing');
                return null;
            }
            
            // Extract problem definitions with better parsing
            const problemDefsString = problemDefsMatch[1];
            // Split by quotes and commas more intelligently
            const problemDefs = problemDefsString.match(/"([^"]+)"/g)?.map(def => 
                def.replace(/"/g, '').trim()
            ).filter(def => def.length > 0) || [];
            
            // Ensure we have exactly 3 problem definitions
            if (problemDefs.length > 3) {
                problemDefs.splice(3);
            } else if (problemDefs.length < 3) {
                while (problemDefs.length < 3) {
                    problemDefs.push(`Technical issue affecting system performance`);
                }
            }
            
            const reconstructed = {
                problemDefinitions: problemDefs.slice(0, 3),
                question: questionMatch[1].trim().replace(/\\"/g, '"'),
                issueType: issueTypeMatch[1].trim().replace(/\\"/g, '"'),
                severity: severityMatch[1].trim().replace(/\\"/g, '"'),
                businessImpact: businessImpactMatch[1].trim().replace(/\\"/g, '"'),
                confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8
            };
            
            
            // Validate the reconstructed response
            const validation = this.validateLLMResponse(reconstructed);
            if (!validation.isValid) {
                console.log('❌ Reconstructed response validation failed:', validation.errors);
                return null;
            }
            
            console.log('✅ Fallback parsing succeeded');
            return reconstructed;
        } catch (error) {
            console.error('❌ Fallback parsing failed:', error);
            return null;
        }
    }

    /**
     * Validate LLM response
     */
    validateLLMResponse(response) {
        const errors = [];

        if (!response.problemDefinitions || !Array.isArray(response.problemDefinitions)) {
            errors.push('problemDefinitions is required and must be an array');
        } else if (response.problemDefinitions.length !== 3) {
            errors.push('problemDefinitions must contain exactly 3 definitions');
        } else {
            response.problemDefinitions.forEach((def, index) => {
                if (typeof def !== 'string' || def.trim().length === 0) {
                    errors.push(`problemDefinitions[${index}] must be a non-empty string`);
                }
            });
        }

        if (!response.question || typeof response.question !== 'string' || response.question.trim().length === 0) {
            errors.push('question is required and must be a non-empty string');
        } else {
            const wordCount = response.question.trim().split(/\s+/).length;
            if (wordCount > 35) {
                // If question is too long, truncate it instead of failing
                const words = response.question.trim().split(/\s+/);
                response.question = words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '');
                console.warn(`⚠️ Question was truncated from ${wordCount} words to 30 words`);
            }
        }

        if (!response.issueType || !ISSUE_TYPE_LIST.includes(response.issueType)) {
            errors.push(`issueType must be one of: ${ISSUE_TYPE_LIST.join(', ')}`);
        }

        if (!response.severity || !SEVERITY_LEVEL_LIST.includes(response.severity)) {
            errors.push(`severity must be one of: ${SEVERITY_LEVEL_LIST.join(', ')}`);
        }

        if (!response.businessImpact || !BUSINESS_IMPACT_CATEGORY_LIST.includes(response.businessImpact)) {
            errors.push(`businessImpact must be one of: ${BUSINESS_IMPACT_CATEGORY_LIST.join(', ')}`);
        }

        if (response.confidence !== undefined && (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1)) {
            errors.push('confidence must be a number between 0 and 1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get default response when LLM fails
     */
    getDefaultResponse(context) {
        const shortDesc = context.shortDescription.substring(0, 30);
        return {
            problemDefinitions: [
                `Technical issue affecting ${shortDesc}...`,
                `Business process problem with ${shortDesc}...`,
                `User experience issue related to ${shortDesc}...`
            ],
            question: `What's blocking the ${shortDesc.toLowerCase()} process?`,
            issueType: config.problemStatement.defaultIssueType,
            severity: config.problemStatement.defaultSeverity,
            businessImpact: config.problemStatement.defaultBusinessImpact,
            confidence: 0.5
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const isLLMAvailable = this.llm && await this.llm.healthCheck();
            
            return {
                success: true,
                data: {
                    agent: 'Problem Statement Agent',
                    status: 'healthy',
                    initialized: this.initialized,
                    llmAvailable: isLLMAvailable,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Health check failed',
                message: error.message
            };
        }
    }

    /**
     * Get agent capabilities
     */
    getCapabilities() {
        return {
            agent: 'Problem Statement Agent',
            version: '1.0.0',
            capabilities: [
                'Generate problem definitions (30-50 words)',
                'Classify issue types',
                'Assess severity levels',
                'Evaluate business impact',
                'Process server logs for context'
            ],
            supportedInputs: [
                'shortDescription (required)',
                'description (optional)',
                'serverLogs (optional array)'
            ],
            outputFormat: {
                problemDefinition: 'string (30-50 words)',
                issueType: 'enum',
                severity: 'enum',
                businessImpact: 'enum',
                confidence: 'number (0-1)'
            }
        };
    }
}

module.exports = new ProblemStatementAgent();
