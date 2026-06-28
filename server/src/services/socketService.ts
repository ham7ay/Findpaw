import { Server as IOServer } from 'socket.io';
import type { Server } from 'http';
import type { GpsLog, PredictedPoint } from '../../../shared/types.js';

let io: IOServer | null = null;

export function initSocket(httpServer: Server, corsOrigin: string) {
  io = new IOServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('subscribe', ({ petId }: { petId: string }) => {
      if (typeof petId === 'string' && petId.length > 0) {
        socket.join(`pet:${petId}`);
      }
    });

    socket.on('unsubscribe', ({ petId }: { petId: string }) => {
      socket.leave(`pet:${petId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.IO ready on /socket.io');
  return io;
}

export function emitGpsUpdate(petId: string, log: GpsLog) {
  io?.to(`pet:${petId}`).emit('gps:update', log);
}

export function emitPredictionUpdate(petId: string, prediction: { points: PredictedPoint[]; riskLevel: string; confidence: number }) {
  io?.to(`pet:${petId}`).emit('prediction:update', prediction);
}

export function emitAlert(petId: string, alert: unknown) {
  io?.to(`pet:${petId}`).emit('alert:new', alert);
}

export function getIO() {
  return io;
}
