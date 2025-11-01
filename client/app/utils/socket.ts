import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Get or create the singleton Socket.IO client instance.
 * Connects to the server (auto-detects origin or uses passed URL).
 */
export function getSocket(serverUrl?: string): Socket {
  if (!socket) {
    // Default to backend server at localhost:3000 in development
    // If no URL is provided and we're on localhost, connect to port 3000
    let url = serverUrl;
    
    if (!url && typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        url = 'http://localhost:3000';
      } else if (currentHost.includes('onrender.com')) {
        // Production: same origin
        url = window.location.origin;
      } else {
        // Local network
        url = `http://${currentHost}:3000`;
      }
    }
    
    socket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // prefer websocket
    });

    socket.on('connect', () => {
      console.log('[socket] connected', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected', reason);
    });
  }

  return socket;
}

/**
 * Close and destroy the singleton socket instance.
 * Useful for cleanup or reconnect scenarios.
 */
export function closeSocket() {
  if (socket) {
    socket.off(); // remove all listeners
    socket.close();
    socket = null;
  }
}
