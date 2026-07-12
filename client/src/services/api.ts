// Thin fetch wrapper that attaches the Firebase ID token to every request.
// All backend calls go through here so authentication & error handling
// stay consistent.

import { getIdToken } from '../lib/firebase';
import type { ApiResponse, Geofence } from '@shared/types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
// Not used while the app runs in demo mode (see GeofencingPage), but ready
// to swap in once pets/devices are backed by the real API.
export const geofenceApi = {
  list: () => api.get<Geofence[]>('/api/geofences'),
  create: (body: Omit<Geofence, 'id' | 'ownerId' | 'createdAt'>) => api.post<Geofence>('/api/geofences', body),
  update: (id: string, body: Partial<Omit<Geofence, 'id' | 'ownerId' | 'createdAt'>>) =>
    api.put<Geofence>(`/api/geofences/${id}`, body),
  remove: (id: string) => api.del<{ id: string }>(`/api/geofences/${id}`),
};