// new file servicenow
const axios = require('axios');
const config = require('../config');
const Ticket = require('../models/Tickets');

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
 * Fetch all tickets from ServiceNow
 */
const fetchTickets = async (options = {}) => {
  try {
    console.log('📥 Fetching tickets from ServiceNow...');
    
    const {
      limit = 100,
      query = '',
      fields = 'sys_id,number,short_description,description,category,subcategory,state,priority,impact,urgency,opened_at,closed_at,resolved_at,caller_id,assigned_to,assignment_group,company,location,tags'
    } = options;

    let allTickets = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && allTickets.length < config.output.maxRecords) {
      const remainingRecords = config.output.maxRecords - allTickets.length;
      const currentLimit = Math.min(limit, remainingRecords);
      
      console.log(`📄 Fetching records ${offset + 1} to ${offset + currentLimit}...`);
      
      const params = {
        sysparm_limit: currentLimit,
        sysparm_offset: offset,
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_display_value: 'true'
      };

      const response = await apiClient.get(config.servicenow.apiEndpoint, { params });

      if (response.status === 200 && response.data.result) {
        const tickets = response.data.result;
        allTickets = allTickets.concat(tickets);
        
        console.log(`✅ Fetched ${tickets.length} tickets (Total: ${allTickets.length})`);
        
        // Check if we have more records
        hasMore = tickets.length === currentLimit && allTickets.length < config.output.maxRecords;
        offset += currentLimit;
        
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
      console.log('⚠️ No tickets found in ServiceNow. This could mean:');
      console.log('   - No tickets match the current query criteria');
      console.log('   - ServiceNow instance has no incident data');
      console.log('   - API credentials or permissions issue');
      console.log('   - ServiceNow API endpoint is incorrect');
      
      return {
        success: true,
        message: 'No tickets found',
        data: [],
        total: 0
      };
    }

    // Save tickets to database
    console.log('💾 Saving tickets to database...');
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const ticketData of allTickets) {
      try {
        // Check if ticket already exists
        const existingTicket = await Ticket.findByTicketId(ticketData.number, 'ServiceNow');
        
        if (!existingTicket) {
          // Create new ticket
          const newTicket = new Ticket({
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
          });
          
          await newTicket.save();
          savedCount++;
        } else {
          // Update existing ticket
          existingTicket.short_description = ticketData.short_description;
          existingTicket.description = ticketData.description;
          existingTicket.category = ticketData.category;
          existingTicket.subcategory = ticketData.subcategory;
          existingTicket.status = ticketData.state;
          existingTicket.priority = ticketData.priority;
          existingTicket.impact = ticketData.impact;
          existingTicket.urgency = ticketData.urgency;
          existingTicket.opened_time = ticketData.opened_at ? new Date(ticketData.opened_at) : null;
          existingTicket.closed_time = ticketData.closed_at ? new Date(ticketData.closed_at) : null;
          existingTicket.resolved_time = ticketData.resolved_at ? new Date(ticketData.resolved_at) : null;
          existingTicket.requester = { id: typeof ticketData.caller_id === 'object' ? ticketData.caller_id.value || ticketData.caller_id.sys_id : ticketData.caller_id };
          existingTicket.assigned_to = { id: typeof ticketData.assigned_to === 'object' ? ticketData.assigned_to.value || ticketData.assigned_to.sys_id : ticketData.assigned_to };
          existingTicket.assignment_group = { id: typeof ticketData.assignment_group === 'object' ? ticketData.assignment_group.value || ticketData.assignment_group.sys_id : ticketData.assignment_group };
          existingTicket.company = { id: typeof ticketData.company === 'object' ? ticketData.company.value || ticketData.company.sys_id : ticketData.company };
          existingTicket.location = { id: typeof ticketData.location === 'object' ? ticketData.location.value || ticketData.location.sys_id : ticketData.location };
          existingTicket.tags = ticketData.tags ? ticketData.tags.split(',').map(tag => tag.trim()) : [];
          existingTicket.raw = ticketData;
          
          await existingTicket.save();
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error saving ticket ${ticketData.number}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Database operations completed:`);
    console.log(`   - New tickets saved: ${savedCount}`);
    console.log(`   - Existing tickets updated: ${updatedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    return {
      success: true,
      message: 'Tickets fetched and saved successfully',
      data: allTickets,
      total: allTickets.length,
      database: {
        saved: savedCount,
        updated: updatedCount,
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

module.exports = {
  fetchTickets
};