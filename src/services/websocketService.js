// new file servicenow
const { Server } = require('socket.io');
const { fetchTicketsFromDB, getTicketStats } = require('./ticketsService');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Set();
    this.clientSyncStates = new Map(); // Track sync state per client
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
          'http://localhost:3001',
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket service initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Handle client joining specific rooms
      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`📡 Client ${socket.id} joined room: ${room}`);
      });

      // Handle client leaving rooms
      socket.on('leave_room', (room) => {
        socket.leave(room);
        console.log(`📡 Client ${socket.id} left room: ${room}`);
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle paginated data requests
      socket.on('request_paginated_data', (options) => {
        this.handlePaginatedDataRequest(socket, options);
      });

      // Handle data statistics requests
      socket.on('request_data_statistics', (options) => {
        this.handleDataStatisticsRequest(socket, options);
      });

      // Handle initial sync requests
      socket.on('request_initial_sync', (options) => {
        this.handleInitialSync(socket, options);
      });

      // Handle incremental sync requests
      socket.on('request_incremental_sync', (options) => {
        this.handleIncrementalSync(socket, options);
      });
    });
  }

  /**
   * Emit ticket update to all connected clients
   * @param {Object} ticketData - The ticket data to broadcast
   * @param {String} eventType - Type of event (new_ticket, updated_ticket, etc.)
   */
  emitTicketUpdate(ticketData, eventType = 'ticket_update') {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized');
      return;
    }

    const eventData = {
      type: eventType,
      ticket: ticketData,
      timestamp: new Date().toISOString()
    };

    // Emit to all connected clients
    this.io.emit('ticket_update', eventData);
    
    // Also emit to specific room for tickets
    this.io.to('tickets').emit('ticket_update', eventData);
    
    console.log(`📡 Emitted ${eventType} to ${this.connectedClients.size} clients`);
  }

  /**
   * Emit new ticket to all connected clients
   * @param {Object} ticketData - The new ticket data
   */
  emitNewTicket(ticketData) {
    this.emitTicketUpdate(ticketData, 'new_ticket');
  }

  /**
   * Emit updated ticket to all connected clients
   * @param {Object} ticketData - The updated ticket data
   */
  emitUpdatedTicket(ticketData) {
    this.emitTicketUpdate(ticketData, 'updated_ticket');
  }

  /**
   * Emit polling status update
   * @param {Object} statusData - The polling status data
   */
  emitPollingStatus(statusData) {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized');
      return;
    }

    const eventData = {
      type: 'polling_status',
      status: statusData,
      timestamp: new Date().toISOString()
    };

    this.io.emit('polling_status', eventData);
    console.log(`📡 Emitted polling status to ${this.connectedClients.size} clients`);
  }

  /**
   * Emit system notification
   * @param {String} message - Notification message
   * @param {String} type - Notification type (info, success, warning, error)
   */
  emitNotification(message, type = 'info') {
    if (!this.io) {
      console.warn('⚠️ WebSocket server not initialized');
      return;
    }

    const eventData = {
      type: 'notification',
      message,
      notificationType: type,
      timestamp: new Date().toISOString()
    };

    this.io.emit('notification', eventData);
    console.log(`📡 Emitted notification to ${this.connectedClients.size} clients`);
  }

  /**
   * Get connected clients count
   * @returns {Number} Number of connected clients
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Handle paginated data request
   * @param {Object} socket - Socket instance
   * @param {Object} options - Request options
   */
  async handlePaginatedDataRequest(socket, options = {}) {
    const clientId = socket.id;
    try {
      console.log(`📄 Handling paginated data request for client ${clientId}`);
      
      const { 
        page = 1, 
        limit = 10, 
        query = '', 
        status, 
        priority, 
        category, 
        source = 'ServiceNow',
        sortBy = 'opened_time',
        sortOrder = 'desc'
      } = options;

      const result = await fetchTicketsFromDB({
        page: parseInt(page),
        limit: parseInt(limit),
        query,
        status,
        priority,
        category,
        source,
        sortBy,
        sortOrder
      });

      if (result.success) {
        socket.emit('paginated_data_response', {
          success: true,
          data: result.data,
          pagination: result.pagination,
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Sent paginated data to client ${clientId}: ${result.data.length} tickets (page ${page})`);
      } else {
        throw new Error(result.error || 'Failed to fetch paginated data');
      }
    } catch (error) {
      console.error(`❌ Paginated data request failed for client ${clientId}:`, error.message);
      socket.emit('paginated_data_error', {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle data statistics request
   * @param {Object} socket - Socket instance
   * @param {Object} options - Request options
   */
  async handleDataStatisticsRequest(socket, options = {}) {
    const clientId = socket.id;
    try {
      console.log(`📊 Handling statistics request for client ${clientId}`);
      
      const { source = 'ServiceNow' } = options;
      const result = await getTicketStats(source);

      if (result.success) {
        socket.emit('data_statistics_response', {
          success: true,
          data: result.data,
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Sent statistics to client ${clientId}`);
      } else {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error(`❌ Statistics request failed for client ${clientId}:`, error.message);
      socket.emit('data_statistics_error', {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Also emit a notification about the error
      socket.emit('notification', {
        message: `Statistics error: ${error.message}`,
        notificationType: 'error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle initial data synchronization for a client
   * @param {Object} socket - Socket instance
   * @param {Object} options - Sync options
   */
  async handleInitialSync(socket, options = {}) {
    const clientId = socket.id;
    try {
      console.log(`🔄 Starting initial sync for client ${clientId}`);
      
      const { 
        batchSize = 200, // Increased from 50 to 200 for faster sync
        source = 'ServiceNow',
        sortBy = 'opened_time',
        sortOrder = 'desc'
      } = options;

      // Initialize client sync state
      this.clientSyncStates.set(clientId, {
        isInitialSyncComplete: false,
        isSyncInProgress: true,
        lastSyncTimestamp: null
      });

      socket.emit('sync_started', {
        message: 'Initial sync started',
        timestamp: new Date().toISOString()
      });

      // Get total count first
      const countResult = await fetchTicketsFromDB({
        page: 1,
        limit: 1,
        source,
        sortBy,
        sortOrder
      });

      if (!countResult.success) {
        throw new Error('Failed to get ticket count');
      }

      const totalTickets = countResult.pagination.totalCount;
      const totalBatches = Math.ceil(totalTickets / batchSize);

      console.log(`📦 Initial sync: ${totalTickets} tickets in ${totalBatches} batches`);

      // Send tickets in batches
      for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        const batchResult = await fetchTicketsFromDB({
          page: batchNum,
          limit: batchSize,
          source,
          sortBy,
          sortOrder
        });

        if (batchResult.success) {
          socket.emit('initial_sync_batch', {
            batchNumber: batchNum,
            totalBatches,
            batch: batchResult.data,
            timestamp: new Date().toISOString()
          });
          
          // Small delay between batches to prevent overwhelming the client
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
        }
      }

      // Mark initial sync as complete
      this.clientSyncStates.set(clientId, {
        isInitialSyncComplete: true,
        isSyncInProgress: false,
        lastSyncTimestamp: new Date().toISOString()
      });

      socket.emit('initial_sync_complete', {
        message: 'Initial sync completed',
        totalTickets,
        totalBatches,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Initial sync completed for client ${clientId}: ${totalTickets} tickets`);

    } catch (error) {
      console.error(`❌ Initial sync failed for client ${clientId}:`, error.message);
      
      this.clientSyncStates.set(clientId, {
        isInitialSyncComplete: false,
        isSyncInProgress: false,
        lastSyncTimestamp: null
      });

      socket.emit('sync_error', {
        message: `Initial sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle incremental data synchronization for a client
   * @param {Object} socket - Socket instance
   * @param {Object} options - Sync options
   */
  async handleIncrementalSync(socket, options = {}) {
    const clientId = socket.id;
    try {
      console.log(`🔄 Starting incremental sync for client ${clientId}`);
      
      const { 
        since, 
        source = 'ServiceNow',
        batchSize = 50
      } = options;

      if (!since) {
        throw new Error('Since timestamp is required for incremental sync');
      }

      // Get updated tickets since the last sync
      const result = await fetchTicketsFromDB({
        page: 1,
        limit: batchSize,
        source,
        sortBy: 'updated_time',
        sortOrder: 'desc',
        updatedSince: since
      });

      if (result.success && result.data.length > 0) {
        socket.emit('incremental_sync_batch', {
          batch: result.data,
          totalTickets: result.data.length,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Incremental sync completed for client ${clientId}: ${result.data.length} updated tickets`);
      } else {
        console.log(`ℹ️ No updates found for client ${clientId} since ${since}`);
      }

      socket.emit('incremental_sync_complete', {
        message: 'Incremental sync completed',
        totalTickets: result.data.length || 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Incremental sync failed for client ${clientId}:`, error.message);
      
      socket.emit('sync_error', {
        message: `Incremental sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get WebSocket server instance
   * @returns {Object} Socket.IO server instance
   */
  getServer() {
    return this.io;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = {
  WebSocketService,
  webSocketService
};


