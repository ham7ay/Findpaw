// Shared types for Find🐾 — used by client, server, and AI service.
// Keep this file framework-agnostic.

export type Role = 'user' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  createdAt: number;
  updatedAt: number;
}

export type Species = 'dog' | 'cat' | 'bird' | 'cattle' | 'other';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed?: string;
  age?: number;
  weight?: number;
  color?: string;
  imageUrl?: string;
  medicalNotes?: string;
  deviceId?: string;
  createdAt: number;
  updatedAt: number;
}

export type DeviceStatus = 'online' | 'offline' | 'low_battery' | 'inactive';

export interface Device {
  id: string;
  ownerId: string;
  serial: string;
  petId?: string;
  status: DeviceStatus;
  battery: number; // 0–100
  lastSync: number;
  firmware: string;
  apiKey: string; // hashed in DB; raw shown only once at creation
  createdAt: number;
}

export interface GpsLog {
  id: string;
  deviceId: string;
  petId?: string;
  ownerId: string;
  lat: number;
  lng: number;
  speed: number;        // m/s
  bearing: number;      // degrees, 0–360
  accuracy: number;     // meters
  altitude?: number;
  battery?: number;
  timestamp: number;    // ms epoch
}

export type AlertType =
  | 'geofence_exit'
  | 'geofence_enter'
  | 'low_battery'
  | 'inactive'
  | 'abnormal_movement'
  | 'escape'
  | 'speed_anomaly'
  | 'tracking_started'
  | 'tracking_stopped';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  ownerId: string;
  petId?: string;
  deviceId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface PredictedPoint {
  lat: number;
  lng: number;
  timestamp: number;     // ms epoch — predicted time at this point
  confidence: number;    // 0–1
  tOffsetSec?: number;   // seconds from the most recent observation
}

export type RiskLevel = 'safe' | 'low' | 'moderate' | 'high';

export interface Prediction {
  id: string;
  petId: string;
  deviceId: string;
  ownerId: string;
  points: PredictedPoint[];
  nextPosition: PredictedPoint;
  likelyDestination?: { lat: number; lng: number; label?: string };
  bearing: number;
  avgSpeed: number;
  riskLevel: RiskLevel;
  riskScore: number;     // 0–100
  anomalies: string[];
  model: 'linear' | 'lstm' | 'hybrid';
  confidence: number;
  createdAt: number;
}

export type GeofenceShape = 'circle' | 'polygon';

export interface Geofence {
  id: string;
  ownerId: string;
  petId?: string;
  name: string;
  shape: GeofenceShape;
  center?: { lat: number; lng: number };
  radius?: number;       // meters, for circle
  polygon?: { lat: number; lng: number }[]; // for polygon
  isSafeZone: boolean;   // true = stay-in; false = avoid
  active: boolean;
  createdAt: number;
}

export interface AnalyticsSummary {
  totalDistance: number;     // meters
  avgSpeed: number;          // m/s
  maxSpeed: number;
  activeMinutes: number;
  pointsCount: number;
  startTime: number;
  endTime: number;
}

export interface PetStats {
  petId: string;
  daily: AnalyticsSummary;
  weekly: AnalyticsSummary;
  monthly: AnalyticsSummary;
}

// ---- API request/response helpers ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}