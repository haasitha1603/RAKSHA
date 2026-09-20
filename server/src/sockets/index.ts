import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/index.js';
import { config } from '../config.js';

let ioInstance: SocketIOServer | null = null;

export function initSockets(io: SocketIOServer): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    socket.on('join', async (data: { room: string; token?: string; passcode?: string }) => {
      if (!data?.room) return;

      const { room, token, passcode } = data;

      // Validate guardian room access: journey:{journeyId}
      if (room.startsWith('journey:')) {
        const journeyId = room.replace('journey:', '');
        if (token) {
          // Verify guardian token belongs to this journey or user
          const guardian = await db.prepare(`SELECT id, user_id FROM guardians WHERE token = ?`).get<{ id: string; user_id: string }>(token);
          const journey = await db.prepare(`SELECT id, user_id, guardian_ids_json FROM journeys WHERE id = ?`).get<{ id: string; user_id: string; guardian_ids_json: string }>(journeyId);

          if (guardian && journey && (journey.user_id === guardian.user_id || journey.guardian_ids_json.includes(guardian.id))) {
            socket.join(room);
            return;
          }
        }
      }

      // Validate responder room: responder:{facilityId}
      if (room.startsWith('responder:')) {
        if (passcode === config.DEMO_RESPONDER_KEY) {
          socket.join(room);
          return;
        }
      }

      // General user or public room join
      socket.join(room);
    });

    socket.on('leave', (room: string) => {
      socket.leave(room);
    });
  });
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function emitToRoom(room: string, event: string, payload: any): void {
  if (ioInstance) {
    ioInstance.to(room).emit(event, payload);
  }
}
