import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Realtime socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Realtime socket disconnected:', reason);
    });
  }

  return socket;
}
