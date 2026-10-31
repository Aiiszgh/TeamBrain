import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = localStorage.getItem('teambrain_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const socketUrl = apiUrl.startsWith('/')
    ? window.location.origin
    : apiUrl.replace(/\/api\/?$/, '');

  if (!socket || socket.disconnected) {
    socket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
