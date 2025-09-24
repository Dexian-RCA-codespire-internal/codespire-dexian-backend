// new file servicenow
const axios = require('axios');
const config = require('../config');
const Ticket = require('../models/Tickets');
const User = require('../models/User');
const { webSocketService } = require('./websocketService');
const { notificationService } = require('./notificationService');
const { createOrUpdateSLA } = require('./slaService');
const mongoose = require('mongoose');
const ticketVectorizationService = require('./ticketVectorizationService');
const moment = require('moment-timezone');
const emailService = require('./emailService');

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



function convertToUTCAndStore(inputDateTimeStr, inputTimeZone = 'GMT') {
  try {
    // Handle empty or null date strings
    if (!inputDateTimeStr || inputDateTimeStr.trim() === '') {
      return null;
    }

    // Step 1: Parse the input as a moment in the given time zone (default: GMT)
    const localMoment = moment.tz(inputDateTimeStr, 'YYYY-MM-DD HH:mm:ss', inputTimeZone);

    // Check if the parsed moment is valid
    if (!localMoment.isValid()) {
      console.warn(`Invalid date string: ${inputDateTimeStr}`);
      return null;
    }

    // Step 2: Convert to UTC
    const utcMoment = localMoment.clone().utc();

    // Return the moment object (MongoDB will handle the conversion)
    return utcMoment.toDate();
  } catch (error) {
    console.error('Error converting date:', error);
    return null;
  } 
}


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
      fields = 'sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags,sys_created_on,sys_updated_on',
      useMaxRecords = false
    } = options;

    // Determine the effective limit
    const effectiveLimit = useMaxRecords ? 
      Math.min(limit, config.output.maxRecords) : 
      limit;

    let allTickets = [];
    let currentOffset = offset;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore && totalFetched < effectiveLimit) {
      const remainingRecords = effectiveLimit - totalFetched;
      const currentLimit = Math.min(limit, remainingRecords);
      
      const params = {
        sysparm_limit: currentLimit,
        sysparm_offset: currentOffset,
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_display_value: true

        
      };

      const response = await apiClient.get(config.servicenow.apiEndpoint, { params });

      if (response.status === 200 && response.data.result) {
        const tickets = response.data.result;
        allTickets = allTickets.concat(tickets);
        totalFetched += tickets.length;
        
        // Check if we have more records
        hasMore = tickets.length === currentLimit && totalFetched < effectiveLimit;
        currentOffset += currentLimit;
        
        // Add a small delay to avoid overwhelming the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`📊 Total tickets fetched: ${allTickets.length}`);
    
    // Check if no data was returned
    if (allTickets.length === 0) {
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
          opened_time: convertToUTCAndStore(ticketData.opened_at, 'GMT'),
          closed_time: convertToUTCAndStore(ticketData.closed_at, 'GMT'),
          resolved_time: convertToUTCAndStore(ticketData.resolved_at, 'GMT'),
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
            
            // Create SLA record for new ticket
            try {
              const slaResult = await createOrUpdateSLA(savedTicket);
              if (!slaResult.success) {
                console.log(`⚠️ Failed to create SLA for ticket ${ticketData.number}: ${slaResult.error}`);
              }
            } catch (slaError) {
              console.error(`❌ Error creating SLA for ticket ${ticketData.number}:`, slaError.message);
              // Don't fail the entire process if SLA creation fails
            }
            
            // Emit WebSocket event for new ticket
            webSocketService.emitNewTicket(newTicket.toObject());
            
            // Send email notification for new ticket
            try {
              const user = await User.findOne({ status: 'active' }).sort({ lastLoginAt: -1 });
              if (user) {
                const ticketEmailData = {
                  ticketId: savedTicket.ticket_id,
                  title: savedTicket.short_description || 'New Ticket',
                  description: savedTicket.description || 'Ticket description not available',
                  priority: savedTicket.priority || 'Normal',
                  assignee: 'System',
                  createdBy: 'ServiceNow',
                  createdAt: new Date(),
                  category: savedTicket.category || 'General',
                  ticketUrl: 'http://localhost:3000/tickets',
                  slaHours: 24
                };
                await emailService.sendNewTicketEmailTemplate([user.email], ticketEmailData);
                console.log(`✅ New ticket email sent to ${user.email}`);
              }
            } catch (emailError) {
              console.error('❌ Email notification failed:', emailError.message);
            }
            
            // Persist notification for new ticket
            await notificationService.createAndBroadcast({
              title: "New ticket",
              message: `Ticket ${ticketData.number} created`,
              type: "success",
              related: {
                ticketMongoId: savedTicket._id,
                ticket_id: ticketData.number,
                eventType: "new_ticket"
              }
            });
          } catch (saveError) {
            console.error(`❌ Error creating ticket ${ticketData.number}:`, saveError.message);
            throw saveError;
          }
        } else {
          // Update existing ticket with timeout handling
          try {
            // Check if there are actual changes to avoid unnecessary notifications
            const hasChanges = 
              existingTicket.status !== ticketDoc.status ||
              existingTicket.description !== ticketDoc.description ||
              existingTicket.priority !== ticketDoc.priority ||
              existingTicket.assigned_to?.id !== ticketDoc.assigned_to?.id ||
              existingTicket.assignment_group?.id !== ticketDoc.assignment_group?.id ||
              JSON.stringify(existingTicket.updatedAt) !== JSON.stringify(new Date(ticketData.sys_updated_on || new Date()));

            if (!hasChanges) {
              // No real changes detected, skip update and notification
              continue;
            }

            const previousStatus = existingTicket.status;
            savedTicket = await Ticket.findOneAndUpdate(
              { ticket_id: ticketData.number, source: 'ServiceNow' },
              ticketDoc,
              { new: true, maxTimeMS: 10000 }
            );
            updatedCount++;
            
            // Update SLA record for existing ticket
            try {
              const slaResult = await createOrUpdateSLA(savedTicket);
              if (!slaResult.success) {
                console.log(`⚠️ Failed to update SLA for ticket ${ticketData.number}: ${slaResult.error}`);
              }
            } catch (slaError) {
              console.error(`❌ Error updating SLA for ticket ${ticketData.number}:`, slaError.message);
              // Don't fail the entire process if SLA update fails
            }
            
            // Emit WebSocket event for updated ticket
            webSocketService.emitUpdatedTicket(savedTicket.toObject());
            
            // Persist notification for updated ticket ONLY if there are real changes
            if (previousStatus !== ticketDoc.status) {
              // Status changed
              await notificationService.createAndBroadcast({
                title: "Ticket status changed",
                message: `Ticket ${ticketData.number} status: ${previousStatus} → ${ticketDoc.status}`,
                type: "info",
                related: {
                  ticketMongoId: savedTicket._id,
                  ticket_id: ticketData.number,
                  eventType: "status_changed"
                }
              });
            } 

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
      fields = 'sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags, sys_created_on,sys_updated_on',
      batchSize = 1000 // Large batch size for bulk import
    } = options;

    let allTickets = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore) {
      
      const params = {
        sysparm_limit: batchSize,
        sysparm_offset: offset,
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_display_value: true
      };

      const response = await apiClient.get(config.servicenow.apiEndpoint, { params });

      if (response.status === 200 && response.data.result) {
        const tickets = response.data.result;
        allTickets = allTickets.concat(tickets);
        totalFetched += tickets.length;
        
        // Check if we have more records
        hasMore = tickets.length === batchSize;
        offset += batchSize;
        
        // Add a small delay to avoid overwhelming the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`📊 Bulk import completed: ${allTickets.length} tickets fetched from ServiceNow`);

    // Save all tickets to database
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
          opened_time: convertToUTCAndStore(ticketData.opened_at, 'GMT'),
          closed_time: convertToUTCAndStore(ticketData.closed_at, 'GMT'),
          resolved_time: convertToUTCAndStore(ticketData.resolved_at, 'GMT'),
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
            isNewTicket = true;
            
            // Create SLA record for new ticket
            try {
              const slaResult = await createOrUpdateSLA(savedTicket);
              if (!slaResult.success) {
                console.log(`⚠️ Failed to create SLA for ticket ${ticketData.number}: ${slaResult.error}`);
              }
            } catch (slaError) {
              console.error(`❌ Error creating SLA for ticket ${ticketData.number}:`, slaError.message);
              // Don't fail the entire process if SLA creation fails
            }
            
            // Emit WebSocket event for new ticket
            webSocketService.emitNewTicket(newTicket.toObject());
            // Persist notification for new ticket
            await notificationService.createAndBroadcast({
              title: "New ticket",
              message: `Ticket ${ticketData.number} created`,
              type: "success",
              related: {
                ticketMongoId: savedTicket._id,
                ticket_id: ticketData.number,
                eventType: "new_ticket"
              }
            });
        } catch (saveError) {
          console.error(`❌ Error creating ticket ${ticketData.number}:`, saveError.message);
          throw saveError;
        }
        } else {
          // Update existing ticket
          savedTicket = await Ticket.findOneAndUpdate(
            { ticket_id: ticketData.number, source: 'ServiceNow' },
            ticketDoc,
            { new: true }
          );
          updatedCount++;
          
          // Update SLA record for existing ticket
          try {
            const slaResult = await createOrUpdateSLA(savedTicket);
            if (!slaResult.success) {
              console.log(`⚠️ Failed to update SLA for ticket ${ticketData.number}: ${slaResult.error}`);
            }
          } catch (slaError) {
            console.error(`❌ Error updating SLA for ticket ${ticketData.number}:`, slaError.message);
            // Don't fail the entire process if SLA update fails
          }
        }

      } catch (error) {
        console.error(`❌ Error saving ticket ${ticketData.number}:`, error.message);
        errorCount++;
      }
    }

    // Batch vectorize all tickets
    if (ticketsForVectorization.length > 0) {
      try {
        const vectorResults = await ticketVectorizationService.vectorizeAndStoreTicketsBatch(
          ticketsForVectorization, 
          mongoIdsForVectorization
        );
        vectorizedCount = vectorResults.successful;
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