/**
 * Result Filter Tool
 * Filters and ranks ticket similarity results based on confidence scores and business rules
 */

const API_CONFIG = require('../config/api-config');

class ResultFilter {
    constructor() {
        this.minConfidenceScore = API_CONFIG.response.minConfidenceScore;
        this.maxResults = API_CONFIG.response.maxResults;
    }

    /**
     * Filter results based on confidence score threshold
     */
    filterByConfidence(results) {
        return results.filter(ticket => 
            ticket.confidence_score >= this.minConfidenceScore
        );
    }

    /**
     * Remove duplicate tickets (if any)
     */
    removeDuplicates(results, queryTicketId = null) {
        const seen = new Set();
        
        return results.filter(ticket => {
            // Skip the query ticket itself if ticket_id is provided
            if (queryTicketId && ticket.ticket_id === queryTicketId) {
                return false;
            }
            
            if (seen.has(ticket.ticket_id)) {
                return false;
            }
            
            seen.add(ticket.ticket_id);
            return true;
        });
    }

    /**
     * Sort results by confidence score (descending)
     */
    sortByConfidence(results) {
        return results.sort((a, b) => b.confidence_score - a.confidence_score);
    }

    /**
     * Limit number of results
     */
    limitResults(results) {
        return results.slice(0, this.maxResults);
    }

    /**
     * Apply business rules for filtering (can be extended)
     */
    applyBusinessRules(results, rules = {}) {
        let filteredResults = [...results];
        
        // Filter by source if specified
        if (rules.allowedSources && rules.allowedSources.length > 0) {
            filteredResults = filteredResults.filter(ticket => 
                rules.allowedSources.includes(ticket.source)
            );
        }
        
        // Filter by category if specified
        if (rules.allowedCategories && rules.allowedCategories.length > 0) {
            filteredResults = filteredResults.filter(ticket => 
                rules.allowedCategories.includes(ticket.category)
            );
        }
        
        // Filter by status if specified
        if (rules.allowedStatuses && rules.allowedStatuses.length > 0) {
            filteredResults = filteredResults.filter(ticket => 
                rules.allowedStatuses.includes(ticket.status)
            );
        }
        
        // Filter by priority if specified
        if (rules.allowedPriorities && rules.allowedPriorities.length > 0) {
            filteredResults = filteredResults.filter(ticket => 
                rules.allowedPriorities.includes(ticket.priority)
            );
        }
        
        // Apply minimum field similarity thresholds
        if (rules.minFieldSimilarities) {
            filteredResults = filteredResults.filter(ticket => {
                const fieldSims = ticket.field_similarities || {};
                
                for (const [field, minScore] of Object.entries(rules.minFieldSimilarities)) {
                    if (fieldSims[field] < minScore) {
                        return false;
                    }
                }
                return true;
            });
        }
        
        return filteredResults;
    }

    /**
     * Add ranking metadata to results
     */
    addRankingMetadata(results) {
        return results.map((ticket, index) => ({
            ...ticket,
            rank: index + 1,
            confidence_percentage: Math.round(ticket.confidence_score * 100)
        }));
    }

    /**
     * Prepare final response format
     */
    prepareResponse(results, options = {}) {
        // Select only the fields specified in API config
        const responseFields = API_CONFIG.response.fields;
        
        const cleanedResults = results.map(ticket => {
            const cleanTicket = {};
            
            // Always include essential fields
            cleanTicket.ticket_id = ticket.ticket_id;
            cleanTicket.source = ticket.source;
            cleanTicket.short_description = ticket.short_description;
            cleanTicket.description = ticket.description;
            cleanTicket.category = ticket.category;
            
            // Include optional fields if they exist
            if (ticket.subcategory) cleanTicket.subcategory = ticket.subcategory;
            if (ticket.status) cleanTicket.status = ticket.status;
            if (ticket.priority) cleanTicket.priority = ticket.priority;
            
            // Always include confidence score
            cleanTicket.confidence_score = ticket.confidence_score;
            
            // Add rank and confidence percentage
            cleanTicket.rank = ticket.rank;
            cleanTicket.confidence_percentage = ticket.confidence_percentage;
            
            // Add debug info if requested
            if (options.includeDebugInfo) {
                cleanTicket.debug = {
                    semantic_score: ticket.semantic_score,
                    field_similarities: ticket.field_similarities
                };
            }
            
            return cleanTicket;
        });
        
        return {
            total_results: cleanedResults.length,
            min_confidence_threshold: this.minConfidenceScore,
            results: cleanedResults
        };
    }

    /**
     * Main filtering pipeline
     */
    filterAndRankResults(results, options = {}) {
        try {
            let filteredResults = [...results];
            
            // Step 1: Remove duplicates
            filteredResults = this.removeDuplicates(filteredResults, options.queryTicketId);
            
            // Step 2: Filter by confidence score
            filteredResults = this.filterByConfidence(filteredResults);
            
            // Step 3: Apply business rules
            if (options.businessRules) {
                filteredResults = this.applyBusinessRules(filteredResults, options.businessRules);
            }
            
            // Step 4: Sort by confidence
            filteredResults = this.sortByConfidence(filteredResults);
            
            // Step 5: Limit results
            filteredResults = this.limitResults(filteredResults);
            
            // Step 6: Add ranking metadata
            filteredResults = this.addRankingMetadata(filteredResults);
            
            // Step 7: Prepare final response
            const response = this.prepareResponse(filteredResults, options);
            
            return response;
        } catch (error) {
            console.error('Error in filtering pipeline:', error);
            throw error;
        }
    }

    /**
     * Get filtering statistics
     */
    getFilteringStats(originalResults, filteredResults) {
        return {
            original_count: originalResults.length,
            filtered_count: filteredResults.total_results,
            filtered_out_count: originalResults.length - filteredResults.total_results,
            confidence_threshold: this.minConfidenceScore,
            max_results_limit: this.maxResults
        };
    }
}

module.exports = ResultFilter;
