import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Gets or creates the Socket.IO connection
 */
export function getSocket(): Socket {
    if (!socket) {
        socket = io();
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
