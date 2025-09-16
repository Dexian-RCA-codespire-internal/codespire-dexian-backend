// new file servicenow
const axios = require('axios');
const config = require('../config');
const Ticket = require('../models/Tickets');
const { webSocketService } = require('./websocketService');
const mongoose = require('mongoose');
const ticketVectorizationService = require('./ticketVectorizationService');

// Bulk Import State Schema
const bulkImportStateSchema = new mongoose.Schema({
  service: { type: String, default: 'servicenow', unique: true },
  hasCompletedInitialImport: { type: Boolean, default: false },
  lastBulkImportTime: { type: Date, default: null },
  totalTicketsImported: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const BulkImportState = mongoose.model('BulkImportState', bulkImportStateSchema);

/**
 * Check if bulk import has already been completed
 */
const hasCompletedBulkImport = async () => {
  try {
    const state = await BulkImportState.findOne({ service: 'servicenow' }).maxTimeMS(10000);
    return state ? state.hasCompletedInitialImport : false;
  } catch (error) {
    console.error('❌ Error checking bulk import state:', error.message);
    return false;
  }
};

/**
 * Mark bulk import as completed
 */
const markBulkImportCompleted = async (totalTicketsImported) => {
  try {
    await BulkImportState.findOneAndUpdate(
      { service: 'servicenow' },
      {
        hasCompletedInitialImport: true,
        lastBulkImportTime: new Date(),
        totalTicketsImported: totalTicketsImported,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    console.log('✅ Bulk import state marked as completed');
  } catch (error) {
    console.error('❌ Error marking bulk import as completed:', error.message);
  }
};

/**
 * Reset bulk import state (for manual re-import)
 */
const resetBulkImportState = async () => {
  try {
    await BulkImportState.findOneAndUpdate(
      { service: 'servicenow' },
      {
        hasCompletedInitialImport: false,
        lastBulkImportTime: null,
        totalTicketsImported: 0,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    console.log('🔄 Bulk import state reset');
  } catch (error) {
    console.error('❌ Error resetting bulk import state:', error.message);
  }
};

/**
 * Get bulk import status
 */
const getBulkImportStatus = async () => {
  try {
    const state = await BulkImportState.findOne({ service: 'servicenow' }).maxTimeMS(10000);
    return {
      hasCompleted: state ? state.hasCompletedInitialImport : false,
      lastImportTime: state ? state.lastBulkImportTime : null,
      totalImported: state ? state.totalTicketsImported : 0
    };
  } catch (error) {
    console.error('❌ Error getting bulk import status:', error.message);
    return {
      hasCompleted: false,
      lastImportTime: null,
      totalImported: 0
    };
  }
};

// Create axios instance with basic auth
const createApiClient = () => {
  return axios.create({
    baseURL: config.servicenow.url,
    auth: {
      username: config.servicenow.username,
      password: config.servicenow.password
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: config.servicenow.timeout
  });
};

const apiClient = createApiClient();


/**
 * Fetch tickets from ServiceNow and save to database (for polling)
 */
const fetchTicketsAndSave = async (options = {}) => {
  try {
    console.log('📥 Fetching tickets from ServiceNow for polling...');
    
    const {
      limit = 10,
      offset = 0,
      query = '',
      fields = 'sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags',
      useMaxRecords = false
    } = options;

    // Determine the effective limit
    const effectiveLimit = useMaxRecords ? 
      Math.min(limit, config.output.maxRecords) : 
      limit;
    
    console.log(`🔧 Requested limit: ${limit}, Effective limit: ${effectiveLimit}`);

    let allTickets = [];
    let currentOffset = offset;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore && totalFetched < effectiveLimit) {
      const remainingRecords = effectiveLimit - totalFetched;
      const currentLimit = Math.min(limit, remainingRecords);
      
      console.log(`📄 Fetching records ${currentOffset + 1} to ${currentOffset + currentLimit}...`);
      
      const params = {
        sysparm_limit: currentLimit,
        sysparm_offset: currentOffset,
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_display_value: 'true'
      };

      const response = await apiClient.get(config.servicenow.apiEndpoint, { params });

      if (response.status === 200 && response.data.result) {
        const tickets = response.data.result;
        allTickets = allTickets.concat(tickets);
        totalFetched += tickets.length;
        
        console.log(`✅ Fetched ${tickets.length} tickets (Total: ${allTickets.length})`);
        
        // Check if we have more records
        hasMore = tickets.length === currentLimit && totalFetched < effectiveLimit;
        currentOffset += currentLimit;
        
        // Add a small delay to avoid overwhelming the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        console.log('⚠️ No more tickets found or API returned unexpected response');
        hasMore = false;
      }
    }

    console.log(`📊 Total tickets fetched: ${allTickets.length}`);
    
    // Check if no data was returned
    if (allTickets.length === 0) {
      console.log('⚠️ No tickets found in ServiceNow for polling');
      return {
        success: true,
        message: 'No tickets found',
        data: [],
        total: 0,
        database: {
          saved: 0,
          updated: 0,
          errors: 0
        }
      };
    }

    // Save tickets to database
    console.log('💾 Saving tickets to database...');
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let vectorizedCount = 0;

    for (const ticketData of allTickets) {
      try {
        const ticketDoc = {
          ticket_id: ticketData.number,
          source: 'ServiceNow',
          short_description: ticketData.short_description,
          description: ticketData.description,
          category: ticketData.category,
          subcategory: ticketData.subcategory,
          status: ticketData.state,
          priority: ticketData.priority,
          impact: ticketData.impact,
          urgency: ticketData.urgency,
          opened_time: ticketData.opened_at ? new Date(ticketData.opened_at) : null,
          closed_time: ticketData.closed_at ? new Date(ticketData.closed_at) : null,
          resolved_time: ticketData.resolved_at ? new Date(ticketData.resolved_at) : null,
          requester: { id: typeof ticketData.caller_id === 'object' ? ticketData.caller_id.value || ticketData.caller_id.sys_id : ticketData.caller_id },
          assigned_to: { id: typeof ticketData.assigned_to === 'object' ? ticketData.assigned_to.value || ticketData.assigned_to.sys_id : ticketData.assigned_to },
          assignment_group: { id: typeof ticketData.assignment_group === 'object' ? ticketData.assignment_group.value || ticketData.assignment_group.sys_id : ticketData.assignment_group },
          company: { id: typeof ticketData.company === 'object' ? ticketData.company.value || ticketData.company.sys_id : ticketData.company },
          location: { id: typeof ticketData.location === 'object' ? ticketData.location.value || ticketData.location.sys_id : ticketData.location },
          tags: ticketData.tags ? ticketData.tags.split(',').map(tag => tag.trim()) : [],
          raw: ticketData
        };

        // Check if ticket exists first with timeout handling
        let existingTicket;
        try {
          existingTicket = await Ticket.findOne({ 
            ticket_id: ticketData.number, 
            source: 'ServiceNow' 
          }).maxTimeMS(10000); // 10 second timeout
        } catch (findError) {
          console.error(`❌ Error checking existing ticket ${ticketData.number}:`, findError.message);
          throw findError;
        }

        let savedTicket;
        let isNewTicket = false;
        
        if (!existingTicket) {
          // Create new ticket with timeout handling
          try {
            const newTicket = new Ticket(ticketDoc);
            savedTicket = await newTicket.save();
            savedCount++;
            isNewTicket = true;
            // Emit WebSocket event for new ticket
          webSocketService.emitNewTicket(newTicket.toObject());
            console.log(`✅ Created new ticket: ${ticketData.number}`);
          } catch (saveError) {
            console.error(`❌ Error creating ticket ${ticketData.number}:`, saveError.message);
            throw saveError;
          }
        } else {
          // Update existing ticket with timeout handling
          try {
            savedTicket = await Ticket.findOneAndUpdate(
              { ticket_id: ticketData.number, source: 'ServiceNow' },
              ticketDoc,
              { new: true, maxTimeMS: 10000 }
            );
            updatedCount++;
            // Emit WebSocket event for updated ticket
          webSocketService.emitUpdatedTicket(savedTicket.toObject());
            console.log(`✅ Updated existing ticket: ${ticketData.number}`);
          } catch (updateError) {
            console.error(`❌ Error updating ticket ${ticketData.number}:`, updateError.message);
            throw updateError;
          }
        }

        // Vectorize and store in Qdrant ONLY for new tickets
        if (isNewTicket) {
          try {
            const vectorResult = await ticketVectorizationService.vectorizeAndStoreTicket(ticketDoc, savedTicket._id);
            if (vectorResult.success) {
              vectorizedCount++;
            } else {
              console.log(`⚠️ Failed to vectorize ticket ${ticketData.number}: ${vectorResult.reason || vectorResult.error}`);
            }
          } catch (vectorError) {
            console.error(`❌ Error vectorizing ticket ${ticketData.number}:`, vectorError.message);
          }
        }

      } catch (error) {
        console.error(`❌ Error saving ticket ${ticketData.number}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Database operations completed:`);
    console.log(`   - New tickets saved: ${savedCount}`);
    console.log(`   - Existing tickets updated: ${updatedCount}`);
    console.log(`   - Vectorized in Qdrant: ${vectorizedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    return {
      success: true,
      message: 'Tickets fetched and saved successfully',
      data: allTickets,
      total: allTickets.length,
      pagination: {
        limit: effectiveLimit,
        offset: offset,
        hasMore: hasMore,
        nextOffset: hasMore ? currentOffset : null
      },
      database: {
        saved: savedCount,
        updated: updatedCount,
        vectorized: vectorizedCount,
        errors: errorCount
      }
    };
  } catch (error) {
    console.error('❌ Error fetching tickets:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Bulk import all tickets from ServiceNow (for initial setup)
 * This function bypasses pagination limits and fetches ALL tickets
 * Includes guardrails to prevent unnecessary re-imports
 */
const bulkImportAllTickets = async (options = {}) => {
  try {
    // Check if bulk import has already been completed
    const alreadyCompleted = await hasCompletedBulkImport();
    if (alreadyCompleted && !options.force) {
      console.log('ℹ️ Bulk import already completed. Use force=true to re-import.');
      const status = await getBulkImportStatus();
      return {
        success: true,
        message: 'Bulk import already completed',
        skipped: true,
        status: status
      };
    }

    console.log('🚀 Starting bulk import of ALL tickets from ServiceNow...');
    
    const {
      query = '',
      fields = 'sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags',
      batchSize = 1000 // Large batch size for bulk import
    } = options;

    let allTickets = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;

    console.log(`🔧 Bulk import settings:`);
    console.log(`   - Batch size: ${batchSize}`);
    console.log(`   - Query filter: ${query || 'None (all tickets)'}`);

    while (hasMore) {
      console.log(`📄 Fetching batch ${Math.floor(offset / batchSize) + 1} (records ${offset + 1} to ${offset + batchSize})...`);
      
      const params = {
        sysparm_limit: batchSize,
        sysparm_offset: offset,
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_display_value: 'true'
      };

      const response = await apiClient.get(config.servicenow.apiEndpoint, { params });

      if (response.status === 200 && response.data.result) {
        const tickets = response.data.result;
        allTickets = allTickets.concat(tickets);
        totalFetched += tickets.length;
        
        console.log(`✅ Fetched ${tickets.length} tickets (Total: ${allTickets.length})`);
        
        // Check if we have more records
        hasMore = tickets.length === batchSize;
        offset += batchSize;
        
        // Add a small delay to avoid overwhelming the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        console.log('⚠️ No more tickets found or API returned unexpected response');
        hasMore = false;
      }
    }

    console.log(`📊 Bulk import completed: ${allTickets.length} tickets fetched from ServiceNow`);

    // Save all tickets to database
    console.log('💾 Saving all tickets to database...');
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let vectorizedCount = 0;
    const ticketsForVectorization = [];
    const mongoIdsForVectorization = [];

    for (const ticketData of allTickets) {
      try {
        // Use upsert to either insert or update in one operation
        const ticketDoc = {
          ticket_id: ticketData.number,
          source: 'ServiceNow',
          short_description: ticketData.short_description,
          description: ticketData.description,
          category: ticketData.category,
          subcategory: ticketData.subcategory,
          status: ticketData.state,
          priority: ticketData.priority,
          impact: ticketData.impact,
          urgency: ticketData.urgency,
          opened_time: ticketData.opened_at ? new Date(ticketData.opened_at) : null,
          closed_time: ticketData.closed_at ? new Date(ticketData.closed_at) : null,
          resolved_time: ticketData.resolved_at ? new Date(ticketData.resolved_at) : null,
          requester: { id: typeof ticketData.caller_id === 'object' ? ticketData.caller_id.value || ticketData.caller_id.sys_id : ticketData.caller_id },
          assigned_to: { id: typeof ticketData.assigned_to === 'object' ? ticketData.assigned_to.value || ticketData.assigned_to.sys_id : ticketData.assigned_to },
          assignment_group: { id: typeof ticketData.assignment_group === 'object' ? ticketData.assignment_group.value || ticketData.assignment_group.sys_id : ticketData.assignment_group },
          company: { id: typeof ticketData.company === 'object' ? ticketData.company.value || ticketData.company.sys_id : ticketData.company },
          location: { id: typeof ticketData.location === 'object' ? ticketData.location.value || ticketData.location.sys_id : ticketData.location },
          tags: ticketData.tags ? ticketData.tags.split(',').map(tag => tag.trim()) : [],
          raw: ticketData // Store original payload
        };

        // Check if ticket exists first with timeout handling
        let existingTicket;
        try {
          existingTicket = await Ticket.findOne({ 
            ticket_id: ticketData.number, 
            source: 'ServiceNow' 
          }).maxTimeMS(10000); // 10 second timeout
        } catch (findError) {
          console.error(`❌ Error checking existing ticket ${ticketData.number}:`, findError.message);
          throw findError;
        }

        let savedTicket;
        let isNewTicket = false;
        
        if (!existingTicket) {
          // Create new ticket
          try {
          const newTicket = new Ticket(ticketDoc);
          savedTicket = await newTicket.save();
          savedCount++;
          isNewTicket = true;// Emit WebSocket event for new ticket
          webSocketService.emitNewTicket(newTicket.toObject());
        } catch (saveError) {
          console.error(`❌ Error creating ticket ${ticketData.number}:`, saveError.message);
          throw saveError;
        }
        } else {
          // Update existing ticket
          await Ticket.findOneAndUpdate(
            { ticket_id: ticketData.number, source: 'ServiceNow' },
            ticketDoc,
            { new: true }
          );
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ Error saving ticket ${ticketData.number}:`, error.message);
        errorCount++;
      }
    }

    // Batch vectorize all tickets
    if (ticketsForVectorization.length > 0) {
      console.log('🔄 Vectorizing tickets for similarity search...');
      try {
        const vectorResults = await ticketVectorizationService.vectorizeAndStoreTicketsBatch(
          ticketsForVectorization, 
          mongoIdsForVectorization
        );
        vectorizedCount = vectorResults.successful;
        console.log(`✅ Vectorization completed: ${vectorResults.successful} successful, ${vectorResults.failed} failed`);
      } catch (vectorError) {
        console.error('❌ Error in batch vectorization:', vectorError.message);
      }
    }

    console.log(`✅ Bulk import database operations completed:`);
    console.log(`   - New tickets saved: ${savedCount}`);
    console.log(`   - Existing tickets updated: ${updatedCount}`);
    console.log(`   - Vectorized in Qdrant: ${vectorizedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // Mark bulk import as completed
    await markBulkImportCompleted(allTickets.length);
    
    return {
      success: true,
      message: 'Bulk import completed successfully',
      data: allTickets,
      total: allTickets.length,
      database: {
        saved: savedCount,
        updated: updatedCount,
        vectorized: vectorizedCount,
        errors: errorCount
      }
    };
  } catch (error) {
    console.error('❌ Error during bulk import:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

module.exports = {
  fetchTicketsAndSave,
  bulkImportAllTickets,
  hasCompletedBulkImport,
  markBulkImportCompleted,
  resetBulkImportState,
  getBulkImportStatus
};