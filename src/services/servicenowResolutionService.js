/**
 * ServiceNow Resolution Service
 * Handles API calls to ServiceNow for ticket resolution updates
 */

const axios = require('axios');
const config = require('../config');
const RCAResolved = require('../models/RCAResolved');
const { servicenow } = require('../constants');
const ticketVectorizationService = require('./ticketVectorizationService');

class ServiceNowResolutionService {
    constructor() {
        this.baseURL = config.servicenow?.baseURL || 'https://dev283514.service-now.com';
        this.auth = {
            username: config.servicenow?.username || 'abel.tuter',
            password: config.servicenow?.password || 'Sagar@2003'
        };
        this.timeout = config.servicenow?.timeout || 30000; // 30 seconds
        this.maxRetries = config.servicenow?.maxRetries || 3;
        this.retryDelay = config.servicenow?.retryDelay || 5000; // 5 seconds
    }

    /**
     * Update ticket resolution in ServiceNow
     */
    async updateTicketResolution(sysId, resolutionData) {
        try {
            console.log(`🔄 Updating ServiceNow ticket resolution for sys_id: ${sysId}`);
            
            // Validate close code
            if (!servicenow.isValidCloseCode(resolutionData.closeCode)) {
                throw new Error(`Invalid close code: ${resolutionData.closeCode}. Valid codes are: ${servicenow.CLOSE_CODE_LIST.join(', ')}`);
            }
            
            const url = `${this.baseURL}/api/now/table/incident/${sysId}`;
            
            const payload = {
                state: "6", // Resolved state
                close_code: resolutionData.closeCode,
                close_notes: resolutionData.customerSummary
            };

            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
                'Cookie': 'glide_user_route=glide.24bdc8acfe46e25d4cede16391cb7676'
            };

            const response = await axios.patch(url, payload, {
                headers,
                timeout: this.timeout,
                validateStatus: (status) => status < 500 // Don't throw for 4xx errors
            });

            if (response.status === 200) {
                console.log(`✅ Successfully updated ServiceNow ticket: ${sysId}`);
                return {
                    success: true,
                    data: response.data,
                    status: response.status
                };
            } else {
                const errorMessage = `ServiceNow API returned status ${response.status}: ${response.statusText}`;
                console.error(`❌ Failed to update ServiceNow ticket ${sysId}:`, errorMessage);
                return {
                    success: false,
                    error: errorMessage,
                    status: response.status,
                    data: response.data
                };
            }

        } catch (error) {
            console.error(`❌ Error updating ServiceNow ticket ${sysId}:`, error.message);
            return {
                success: false,
                error: error.message,
                isNetworkError: error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND'
            };
        }
    }

    /**
     * Update ticket resolution with retry logic
     */
    async updateTicketResolutionWithRetry(sysId, resolutionData, maxRetries = null) {
        const retries = maxRetries || this.maxRetries;
        let lastError = null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${retries} to update ServiceNow ticket: ${sysId}`);
                
                const result = await this.updateTicketResolution(sysId, resolutionData);
                
                if (result.success) {
                    return result;
                }
                
                lastError = result.error;
                
                // Don't retry for certain HTTP status codes
                if (result.status && [400, 401, 403, 404].includes(result.status)) {
                    console.log(`❌ Non-retryable error for ticket ${sysId}: ${result.status}`);
                    break;
                }
                
                // Wait before retry (except on last attempt)
                if (attempt < retries) {
                    console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
                    await this.delay(this.retryDelay);
                }
                
            } catch (error) {
                lastError = error.message;
                console.error(`❌ Attempt ${attempt} failed for ticket ${sysId}:`, error.message);
                
                // Wait before retry (except on last attempt)
                if (attempt < retries) {
                    await this.delay(this.retryDelay);
                }
            }
        }

        return {
            success: false,
            error: `Failed after ${retries} attempts: ${lastError}`,
            attempts: retries
        };
    }

    /**
     * Save resolution to database and update ServiceNow
     */
    async saveAndUpdateResolution(ticket, resolutionData) {
        try {
            console.log(`💾 Saving resolution for ticket: ${ticket.ticket_id}`);
            
            // Create RCA resolution record
            const rcaResolution = new RCAResolved({
                ticket_id: ticket._id,
                ticket_number: ticket.ticket_id,
                source: ticket.source,
                short_description: ticket.short_description,
                description: ticket.description,
                category: ticket.category,
                priority: ticket.priority,
                impact: ticket.impact,
                urgency: ticket.urgency,
                sys_id: ticket.raw?.sys_id,
                root_cause: resolutionData.rootCause,
                close_code: resolutionData.closeCode,
                customer_summary: resolutionData.customerSummary,
                problem_statement: resolutionData.problemStatement,
                resolution_analysis: resolutionData.analysis,
                processing_time_ms: resolutionData.processing_time_ms,
                raw_ticket_data: ticket,
                raw_resolution_data: resolutionData
            });

            // Save to database
            await rcaResolution.save();
            console.log(`✅ RCA resolution saved to database: ${rcaResolution._id}`);

            // Vectorize and store in Qdrant for similarity search
            try {
                const vectorResult = await ticketVectorizationService.vectorizeAndStoreTicket(ticket, rcaResolution._id);
                if (vectorResult.success) {
                    console.log(`✅ Resolved ticket vectorized and stored in Qdrant: ${ticket.ticket_id}`);
                } else {
                    console.log(`⚠️ Failed to vectorize resolved ticket ${ticket.ticket_id}: ${vectorResult.reason || vectorResult.error}`);
                }
            } catch (vectorError) {
                console.error(`❌ Error vectorizing resolved ticket ${ticket.ticket_id}:`, vectorError.message);
            }

            // Update ServiceNow if sys_id is available
            if (ticket.raw?.sys_id) {
                const serviceNowResult = await this.updateTicketResolutionWithRetry(
                    ticket.raw.sys_id,
                    resolutionData
                );

                // Update the database record with ServiceNow update status
                if (serviceNowResult.success) {
                    await rcaResolution.markServiceNowUpdateAttempt(true);
                    console.log(`✅ ServiceNow updated successfully for ticket: ${ticket.ticket_id}`);
                } else {
                    await rcaResolution.markServiceNowUpdateAttempt(false, serviceNowResult.error);
                    console.log(`⚠️ ServiceNow update failed for ticket: ${ticket.ticket_id} - ${serviceNowResult.error}`);
                }

                return {
                    success: true,
                    rcaResolution,
                    serviceNowUpdate: serviceNowResult,
                    message: 'Resolution saved and ServiceNow updated'
                };
            } else {
                console.log(`⚠️ No sys_id found for ticket: ${ticket.ticket_id}, skipping ServiceNow update`);
                return {
                    success: true,
                    rcaResolution,
                    serviceNowUpdate: null,
                    message: 'Resolution saved (ServiceNow update skipped - no sys_id)'
                };
            }

        } catch (error) {
            console.error(`❌ Error saving resolution for ticket ${ticket.ticket_id}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process pending ServiceNow updates
     */
    async processPendingUpdates() {
        try {
            console.log('🔄 Processing pending ServiceNow updates...');
            
            const pendingUpdates = await RCAResolved.findPendingServiceNowUpdates();
            console.log(`📋 Found ${pendingUpdates.length} pending ServiceNow updates`);

            const results = [];
            
            for (const rcaResolution of pendingUpdates) {
                if (!rcaResolution.canRetryServiceNowUpdate()) {
                    console.log(`⏭️ Skipping ticket ${rcaResolution.ticket_number} - retry not allowed`);
                    continue;
                }

                const resolutionData = {
                    closeCode: rcaResolution.close_code,
                    customerSummary: rcaResolution.customer_summary
                };

                const result = await this.updateTicketResolutionWithRetry(
                    rcaResolution.sys_id,
                    resolutionData
                );

                if (result.success) {
                    await rcaResolution.markServiceNowUpdateAttempt(true);
                    console.log(`✅ Updated ServiceNow for ticket: ${rcaResolution.ticket_number}`);
                } else {
                    await rcaResolution.markServiceNowUpdateAttempt(false, result.error);
                    console.log(`❌ Failed to update ServiceNow for ticket: ${rcaResolution.ticket_number} - ${result.error}`);
                }

                results.push({
                    ticket_number: rcaResolution.ticket_number,
                    sys_id: rcaResolution.sys_id,
                    success: result.success,
                    error: result.error
                });
            }

            return {
                success: true,
                processed: results.length,
                results
            };

        } catch (error) {
            console.error('❌ Error processing pending ServiceNow updates:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get ServiceNow update statistics
     */
    async getUpdateStatistics() {
        try {
            const total = await RCAResolved.countDocuments();
            const updated = await RCAResolved.countDocuments({ servicenow_updated: true });
            const pending = await RCAResolved.countDocuments({ 
                servicenow_updated: false,
                servicenow_update_attempts: { $lt: 3 }
            });
            const failed = await RCAResolved.countDocuments({ 
                servicenow_updated: false,
                servicenow_update_attempts: { $gte: 3 }
            });

            return {
                success: true,
                statistics: {
                    total,
                    updated,
                    pending,
                    failed,
                    successRate: total > 0 ? Math.round((updated / total) * 100) : 0
                }
            };

        } catch (error) {
            console.error('❌ Error getting update statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Health check for ServiceNow connectivity
     */
    async healthCheck() {
        try {
            const url = `${this.baseURL}/api/now/table/incident?sysparm_limit=1`;
            const headers = {
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')}`
            };

            const response = await axios.get(url, {
                headers,
                timeout: 10000 // 10 second timeout for health check
            });

            return {
                status: 'healthy',
                service: 'servicenow-resolution',
                baseURL: this.baseURL,
                responseTime: response.headers['x-response-time'] || 'unknown',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'servicenow-resolution',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Utility method to add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const serviceNowResolutionService = new ServiceNowResolutionService();

module.exports = {
    ServiceNowResolutionService,
    serviceNowResolutionService
};
