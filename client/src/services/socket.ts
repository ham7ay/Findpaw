// Real-time GPS update channel via Socket.IO.
// Falls back gracefully if the backend isn't running — components
// using this hook will just stop receiving live pushes.

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GpsLog } from '@shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let sharedSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export function useGpsStream(petId: string | undefined, onUpdate: (log: GpsLog) => void) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!petId) return;
    const s = getSocket();
    const room = `pet:${petId}`;
    s.emit('subscribe', room);

    const handler = (log: GpsLog) => {
      if (log.petId === petId) cb.current(log);
    };
    s.on('gps:update', handler);

    return () => {
      s.emit('unsubscribe', room);
      s.off('gps:update', handler);
    };
  }, [petId]);
}
