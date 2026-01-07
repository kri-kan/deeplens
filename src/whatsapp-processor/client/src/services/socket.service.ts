import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Gets or creates the Socket.IO connection with resilient configuration
 */
export function getSocket(): Socket {
    if (!socket) {
        socket = io({
            // Automatic reconnection with exponential backoff
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,

            // Timeout settings
            timeout: 20000,

            // Use polling first, then upgrade to WebSocket
            transports: ['polling', 'websocket'],

            // Upgrade to WebSocket after initial connection
            upgrade: true,
        });

        // Connection event handlers for debugging
        socket.on('connect', () => {
            console.log('✅ Socket.IO connected');
        });

        socket.on('disconnect', (reason) => {
            console.warn('⚠️ Socket.IO disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket.IO connection error:', error.message);
            // Socket.IO will automatically attempt to reconnect
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}...`);
        });

        socket.on('reconnect_error', (error) => {
            console.error('❌ Socket.IO reconnection error:', error.message);
        });

        socket.on('reconnect_failed', () => {
            console.error('❌ Socket.IO reconnection failed - giving up');
        });
    }
    return socket;
}

/**
 * Disconnects the socket
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.close();
        socket = null;
    }
}
