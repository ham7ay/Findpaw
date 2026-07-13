// Thin fetch wrapper that attaches the Firebase ID token to every request.
// All backend calls go through here so authentication & error handling
// stay consistent.

import { getIdToken } from '../lib/firebase';
import type { ApiResponse, Geofence, Pet, Device, GpsLog, Alert } from '@shared/types';

export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;

  if (!res.ok || json.success === false) {
    throw new ApiError(json.error || `HTTP ${res.status}`, res.status);
  }
  return json.data as T;
}

export const api = {
  get:  <T>(path: string)               => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT',  body: JSON.stringify(body ?? {}) }),
  del:  <T>(path: string)               => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };

// Thin wrapper around the existing server/src/routes/geofences.ts endpoints.
interface GeofenceInput {
  name: string;
  petId: string;
  center: { lat: number; lng: number };
  radius: number;
  isSafeZone?: boolean;
  active?: boolean;
}

export const geofenceApi = {
  list: (petId?: string) => api.get<Geofence[]>(`/api/geofences${petId ? `?petId=${petId}` : ''}`),
  create: (body: GeofenceInput) => api.post<Geofence>('/api/geofences', body),
  update: (id: string, body: Partial<GeofenceInput>) => api.put<Geofence>(`/api/geofences/${id}`, body),
  remove: (id: string) => api.del<{ id: string }>(`/api/geofences/${id}`),
};

export const alertApi = {
  list: (opts?: { unreadOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set('unread', 'true');
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return api.get<Alert[]>(`/api/alerts${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) => api.post<{ success: true }>(`/api/alerts/${id}/read`),
  markAllRead: () => api.post<{ updated: number }>('/api/alerts/read-all'),
  remove: (id: string) => api.del<{ id: string }>(`/api/alerts/${id}`),
};

export const gpsApi = {
  history: (petId: string, opts?: { limit?: number; since?: number }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.since) params.set('since', String(opts.since));
    const qs = params.toString();
    return api.get<GpsLog[]>(`/api/gps/${petId}${qs ? `?${qs}` : ''}`);
  },
};

export const authApi = {
  me: () => api.get<{ uid: string; email: string; role: 'user' | 'admin'; displayName: string; createdAt: number }>('/api/auth/me'),
  setRole: (uid: string, role: 'user' | 'admin') => api.post<{ success: true }>('/api/auth/role', { uid, role }),
};

export const adminApi = {
  users: () => api.get<{ uid: string; email: string; role: 'user' | 'admin'; displayName: string; createdAt: number }[]>('/api/admin/users'),
  devices: () => api.get<Device[]>('/api/admin/devices'),
  stats: () => api.get<{ users: number; pets: number; devices: number; alerts: number; gpsLogs: number; predictions: number }>('/api/admin/stats'),
  deleteUser: (uid: string) => api.del<{ success: true }>(`/api/admin/users/${uid}`),
};

export const petApi = {
  list: () => api.get<Pet[]>('/api/pets'),
  create: (body: Omit<Pet, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => api.post<Pet>('/api/pets', body),
  update: (id: string, body: Partial<Omit<Pet, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Pet>(`/api/pets/${id}`, body),
  remove: (id: string) => api.del<{ id: string }>(`/api/pets/${id}`),
};

// Device registration is user-authenticated (via `api`), but the resulting
// rawKey + device id are then used for *device*-authenticated GPS uploads
// (X-Device-Id / X-Device-Key headers) — see TrackerSetupPage.tsx.
export const deviceApi = {
  list: () => api.get<Device[]>('/api/devices'),
  create: (body: { serial: string; petId?: string; firmware?: string }) =>
    api.post<Device & { rawKey: string }>('/api/devices', body),
  rotateKey: (id: string) => api.post<{ rawKey: string }>(`/api/devices/${id}/rotate-key`),
  remove: (id: string) => api.del<{ id: string }>(`/api/devices/${id}`),
};