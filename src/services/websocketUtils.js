/**
 * WebSocket Utilities
 * Modular WebSocket helper functions for streaming and real-time communication
 */

const { webSocketService } = require('./websocketService');

class WebSocketUtils {
    /**
     * Stream text content in chunks to a specific socket
     * @param {string} socketId - Target socket ID
     * @param {string} content - Content to stream
     * @param {Object} options - Streaming options
     */
    static async streamContent(socketId, content, options = {}) {
        const {
            eventName = 'content_stream',
            chunkSize = 50,
            delay = 100,
            type = 'text',
            metadata = {}
        } = options;

        try {
            if (!webSocketService.getServer()) {
                throw new Error('WebSocket server not initialized');
            }

            const chunks = this.splitIntoChunks(content, chunkSize);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const isLast = i === chunks.length - 1;
                
                const eventData = {
                    type,
                    chunk,
                    isLast,
                    progress: Math.round(((i + 1) / chunks.length) * 100),
                    timestamp: new Date().toISOString(),
                    ...metadata
                };

                webSocketService.getServer().to(socketId).emit(eventName, eventData);
                
                // Add delay between chunks
                if (!isLast && delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            return {
                success: true,
                chunksStreamed: chunks.length,
                totalCharacters: content.length
            };

        } catch (error) {
            console.error('❌ Error in streamContent:', error);
            throw error;
        }
    }

    /**
     * Emit progress update to a specific socket
     * @param {string} socketId - Target socket ID
     * @param {Object} progressData - Progress information
     */
    static emitProgress(socketId, progressData) {
        try {
            if (!webSocketService.getServer()) {
                console.warn('⚠️ WebSocket server not initialized');
                return false;
            }

            const eventData = {
                ...progressData,
                timestamp: new Date().toISOString()
            };

            webSocketService.getServer().to(socketId).emit('progress_update', eventData);
            return true;

        } catch (error) {
            console.error('❌ Error in emitProgress:', error);
            return false;
        }
    }

    /**
     * Emit completion event to a specific socket
     * @param {string} socketId - Target socket ID
     * @param {Object} completionData - Completion information
     * @param {string} eventName - Custom event name
     */
    static emitCompletion(socketId, completionData, eventName = 'task_complete') {
        try {
            if (!webSocketService.getServer()) {
                console.warn('⚠️ WebSocket server not initialized');
                return false;
            }

            const eventData = {
                ...completionData,
                timestamp: new Date().toISOString()
            };

            webSocketService.getServer().to(socketId).emit(eventName, eventData);
            return true;

        } catch (error) {
            console.error('❌ Error in emitCompletion:', error);
            return false;
        }
    }

    /**
     * Emit error to a specific socket
     * @param {string} socketId - Target socket ID
     * @param {Object} errorData - Error information
     * @param {string} eventName - Custom event name
     */
    static emitError(socketId, errorData, eventName = 'task_error') {
        try {
            if (!webSocketService.getServer()) {
                console.warn('⚠️ WebSocket server not initialized');
                return false;
            }

            const eventData = {
                error: errorData.error || errorData.message || 'Unknown error',
                type: errorData.type || 'general',
                details: errorData.details || null,
                timestamp: new Date().toISOString()
            };

            webSocketService.getServer().to(socketId).emit(eventName, eventData);
            return true;

        } catch (error) {
            console.error('❌ Error in emitError:', error);
            return false;
        }
    }

    /**
     * Join a socket to a specific room
     * @param {string} socketId - Socket ID
     * @param {string} room - Room name
     */
    static joinRoom(socketId, room) {
        try {
            if (!webSocketService.getServer()) {
                console.warn('⚠️ WebSocket server not initialized');
                return false;
            }

            const socket = webSocketService.getServer().sockets.sockets.get(socketId);
            if (socket) {
                socket.join(room);
                console.log(`📡 Socket ${socketId} joined room: ${room}`);
                return true;
            } else {
                console.warn(`⚠️ Socket ${socketId} not found`);
                return false;
            }

        } catch (error) {
            console.error('❌ Error in joinRoom:', error);
            return false;
        }
    }

    /**
     * Leave a socket from a specific room
     * @param {string} socketId - Socket ID
     * @param {string} room - Room name
     */
    static leaveRoom(socketId, room) {
        try {
            if (!webSocketService.getServer()) {
                console.warn('⚠️ WebSocket server not initialized');
                return false;
            }

            const socket = webSocketService.getServer().sockets.sockets.get(socketId);
            if (socket) {
                socket.leave(room);
                console.log(`📡 Socket ${socketId} left room: ${room}`);
                return true;
            } else {
                console.warn(`⚠️ Socket ${socketId} not found`);
                return false;
            }

        } catch (error) {
            console.error('❌ Error in leaveRoom:', error);
            return false;
        }
    }

    /**
     * Emit to all sockets in a room
     * @param {string} room - Room name
     * @param {string} eventName - Event name
     * @param {Object} data - Data to emit
     */
    static emitToRoom(room, eventName, data) {
        try {
            if (!webSocketService.getServer()) {
                console.warn('⚠️ WebSocket server not initialized');
                return false;
            }

            const eventData = {
                ...data,
                timestamp: new Date().toISOString()
            };

            webSocketService.getServer().to(room).emit(eventName, eventData);
            console.log(`📡 Emitted ${eventName} to room: ${room}`);
            return true;

        } catch (error) {
            console.error('❌ Error in emitToRoom:', error);
            return false;
        }
    }

    /**
     * Check if a socket is connected
     * @param {string} socketId - Socket ID to check
     */
    static isSocketConnected(socketId) {
        try {
            if (!webSocketService.getServer()) {
                return false;
            }

            const socket = webSocketService.getServer().sockets.sockets.get(socketId);
            return socket && socket.connected;

        } catch (error) {
            console.error('❌ Error in isSocketConnected:', error);
            return false;
        }
    }

    /**
     * Get connected sockets count
     */
    static getConnectedSocketsCount() {
        try {
            if (!webSocketService.getServer()) {
                return 0;
            }

            return webSocketService.getServer().sockets.sockets.size;

        } catch (error) {
            console.error('❌ Error in getConnectedSocketsCount:', error);
            return 0;
        }
    }

    /**
     * Split text into chunks for streaming
     * @param {string} text - Text to split
     * @param {number} chunkSize - Size of each chunk
     */
    static splitIntoChunks(text, chunkSize) {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Create streaming handler for agents
     * @param {string} socketId - Target socket ID
     * @param {Object} events - Event names configuration
     */
    static createStreamingHandler(socketId, events = {}) {
        const {
            progressEvent = 'progress_update',
            contentEvent = 'content_stream',
            completeEvent = 'task_complete',
            errorEvent = 'task_error'
        } = events;

        return {
            emitProgress: (data) => this.emitProgress(socketId, data),
            streamContent: (content, options = {}) => this.streamContent(socketId, content, {
                eventName: contentEvent,
                ...options
            }),
            emitCompletion: (data) => this.emitCompletion(socketId, data, completeEvent),
            emitError: (error) => this.emitError(socketId, error, errorEvent),
            joinRoom: (room) => this.joinRoom(socketId, room),
            leaveRoom: (room) => this.leaveRoom(socketId, room),
            isConnected: () => this.isSocketConnected(socketId)
        };
    }

    /**
     * Create a streaming session with automatic cleanup
     * @param {string} socketId - Target socket ID
     * @param {Object} sessionConfig - Session configuration
     */
    static async createStreamingSession(socketId, sessionConfig = {}) {
        const {
            room = null,
            timeout = 30000, // 30 seconds timeout
            events = {}
        } = sessionConfig;

        const handler = this.createStreamingHandler(socketId, events);
        
        // Join room if specified
        if (room) {
            handler.joinRoom(room);
        }

        // Set timeout for cleanup
        const timeoutId = setTimeout(() => {
            console.log(`⏰ Streaming session timeout for socket: ${socketId}`);
            if (room) {
                handler.leaveRoom(room);
            }
            handler.emitError({ 
                error: 'Session timeout',
                type: 'timeout' 
            });
        }, timeout);

        // Return handler with cleanup function
        return {
            ...handler,
            cleanup: () => {
                clearTimeout(timeoutId);
                if (room) {
                    handler.leaveRoom(room);
                }
            }
        };
    }
}

module.exports = WebSocketUtils;
