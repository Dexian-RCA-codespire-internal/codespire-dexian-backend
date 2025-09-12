/**
 * Similarity Workflow
 * Extensible workflow for complex ticket similarity operations
 * This can be enhanced to include multi-step processes, human-in-the-loop validation, etc.
 */

class SimilarityWorkflow {
    constructor(agent) {
        this.agent = agent;
        this.steps = [];
        this.results = [];
    }

    /**
     * Add a step to the workflow
     */
    addStep(name, handler) {
        this.steps.push({ name, handler });
        return this;
    }

    /**
     * Execute the workflow
     */
    async execute(input, context = {}) {
        this.results = [];
        
        for (const step of this.steps) {
            try {
                console.log(`Executing workflow step: ${step.name}`);
                const result = await step.handler(input, context, this.results);
                this.results.push({
                    step: step.name,
                    success: true,
                    result,
                    timestamp: new Date().toISOString()
                });
                
                // Update context for next step
                context = { ...context, ...result };
            } catch (error) {
                console.error(`Error in workflow step ${step.name}:`, error);
                this.results.push({
                    step: step.name,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        }
        
        return {
            success: true,
            steps: this.results,
            final_result: context
        };
    }

    /**
     * Create a standard similarity search workflow
     */
    static createStandardWorkflow(agent) {
        return new SimilarityWorkflow(agent)
            .addStep('validate_input', async (input) => {
                const validation = agent.validateTicketInput(input);
                if (!validation.isValid) {
                    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                }
                return { validated_input: input };
            })
            .addStep('preprocess', async (input) => {
                const processed = agent.preprocessTicket(input);
                return { processed_ticket: processed };
            })
            .addStep('retrieve_similar', async (input, context) => {
                const similar = await agent.retriever.retrieveSimilarTickets(context.processed_ticket);
                return { raw_results: similar };
            })
            .addStep('filter_results', async (input, context) => {
                const filtered = agent.filter.filterAndRankResults(context.raw_results);
                return { filtered_results: filtered };
            });
    }

    /**
     * Create an enhanced workflow with explanation generation
     */
    static createEnhancedWorkflow(agent) {
        return SimilarityWorkflow.createStandardWorkflow(agent)
            .addStep('generate_explanation', async (input, context) => {
                if (context.filtered_results.total_results > 0) {
                    const explanation = await agent.generateSimilarityExplanation(
                        input, 
                        context.filtered_results
                    );
                    return { explanation };
                }
                return { explanation: null };
            });
    }
}

module.exports = SimilarityWorkflow;
