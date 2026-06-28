// =================================================================
// Find🐾 — Server-side AI trajectory predictor
// =================================================================
// Mirrors client/src/services/aiPredictor.ts so predictions can be
// computed authoritatively on the server before being persisted.
// If AI_SERVICE_URL is configured, requests are proxied to the
// Python LSTM microservice; otherwise the local JS implementation
// is used.
// =================================================================

import type { GpsLog, PredictedPoint, Prediction, RiskLevel } from '../../../shared/types.js';

interface PredictionInput {
  logs: GpsLog[];
  horizonSteps?: number;
  stepSeconds?: number;
}

export interface PredictionResult {
  points: PredictedPoint[];
  nextPosition: PredictedPoint;
  bearing: number;
  avgSpeed: number;
  confidence: number;
  riskLevel: RiskLevel;
  riskScore: number;
  anomalies: string[];
  model: 'linear' | 'lstm' | 'hybrid';
}

// ---- Geometry helpers ----
function toLocalXY(p: { lat: number; lng: number }, anchor: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  return {
    x: R * toRad(p.lng - anchor.lng) * Math.cos(toRad(anchor.lat)),
    y: R * toRad(p.lat - anchor.lat),
  };
}

function fromLocalXY(p: { x: number; y: number }, anchor: { lat: number; lng: number }) {
  const R = 6371000;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  return {
    lat: anchor.lat + toDeg(p.y / R),
    lng: anchor.lng + toDeg(p.x / (R * Math.cos((anchor.lat * Math.PI) / 180))),
  };
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function linearRegression(xs: number[], ys: number[]): [number, number] {
  const n = xs.length;
  if (n < 2) return [ys[0] ?? 0, 0];
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return [sumY / n, 0];
  const slope = (n * sumXY - sumX * sumY) / denom;
  return [(sumY - slope * sumX) / n, slope];
}

function ewma(values: number[], alpha = 0.4): number {
  if (values.length === 0) return 0;
  let v = values[0];
  for (let i = 1; i < values.length; i++) v = alpha * values[i] + (1 - alpha) * v;
  return v;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
}

/**
 * Run the hybrid linear regression + dead-reckoning predictor locally.
 */
export function predictTrajectoryLocal(input: PredictionInput): PredictionResult {
  const logs = [...input.logs].sort((a, b) => a.timestamp - b.timestamp);
  const horizon = input.horizonSteps ?? 8;
  const stepSec = input.stepSeconds ?? 60;

  if (logs.length === 0) {
    return {
      points: [],
      nextPosition: { lat: 0, lng: 0, timestamp: Date.now(), confidence: 0 },
      bearing: 0,
      avgSpeed: 0,
      confidence: 0,
      riskLevel: 'safe',
      riskScore: 0,
      anomalies: ['No GPS data'],
      model: 'linear',
    };
  }

  const last = logs[logs.length - 1];
  const anchor = { lat: last.lat, lng: last.lng };

  if (logs.length < 3) {
    const stationary: PredictedPoint[] = Array.from({ length: horizon }, (_, i) => ({
      lat: anchor.lat,
      lng: anchor.lng,
      timestamp: last.timestamp + (i + 1) * stepSec * 1000,
      confidence: 0.25,
      tOffsetSec: (i + 1) * stepSec,
    }));
    return {
      points: stationary,
      nextPosition: stationary[0],
      bearing: last.bearing ?? 0,
      avgSpeed: last.speed ?? 0,
      confidence: 0.25,
      riskLevel: 'safe',
      riskScore: 5,
      anomalies: ['Insufficient history for high-confidence prediction'],
      model: 'linear',
    };
  }

  const pts = logs.map((l) => ({
    t: (l.timestamp - logs[0].timestamp) / 1000,
    ...toLocalXY(l, anchor),
  }));
  const ts = pts.map((p) => p.t);
  const [ax, bx] = linearRegression(ts, pts.map((p) => p.x));
  const [ay, by] = linearRegression(ts, pts.map((p) => p.y));

  const speeds: number[] = [];
  const bearings: number[] = [];
  for (let i = 1; i < logs.length; i++) {
    const dt = (logs[i].timestamp - logs[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;
    speeds.push(haversine(logs[i - 1], logs[i]) / dt);
    bearings.push(bearing(logs[i - 1], logs[i]));
  }
  const avgSpeed = ewma(speeds);
  const lastBearing = bearings[bearings.length - 1] ?? 0;
  const smoothBearing = ewma(bearings);

  const speedSd = stdev(speeds);
  const bearingSd = stdev(bearings);
  const varPenalty = Math.min(1, (speedSd / Math.max(avgSpeed, 0.5) + bearingSd / 180) / 2);
  const baseConf = Math.max(0.35, 0.92 - varPenalty * 0.5);

  const baseT = pts[pts.length - 1].t;
  const drRad = (smoothBearing * Math.PI) / 180;
  const drVx = Math.sin(drRad) * avgSpeed;
  const drVy = Math.cos(drRad) * avgSpeed;

  const predicted: PredictedPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    const t = baseT + i * stepSec;
    const xReg = ax + bx * t;
    const yReg = ay + by * t;
    const xDr = pts[pts.length - 1].x + drVx * i * stepSec;
    const yDr = pts[pts.length - 1].y + drVy * i * stepSec;
    const w = Math.min(1, i / horizon);
    const ll = fromLocalXY({ x: xDr * (1 - w) + xReg * w, y: yDr * (1 - w) + yReg * w }, anchor);
    predicted.push({
      lat: ll.lat,
      lng: ll.lng,
      timestamp: last.timestamp + i * stepSec * 1000,
      confidence: Math.max(0.15, baseConf * Math.pow(0.93, i - 1)),
      tOffsetSec: i * stepSec,
    });
  }

  const anomalies: string[] = [];
  const sorted = [...speeds].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const recent = speeds[speeds.length - 1] ?? 0;
  if (median > 0 && recent > median * 2.5) {
    anomalies.push(`Speed spike (${recent.toFixed(1)} m/s vs median ${median.toFixed(1)} m/s)`);
  }
  if (bearings.length >= 2) {
    const b1 = bearings[bearings.length - 2];
    const b2 = bearings[bearings.length - 1];
    const diff = Math.min(Math.abs(b1 - b2), 360 - Math.abs(b1 - b2));
    if (diff > 120) anomalies.push(`Direction reversal Δ=${diff.toFixed(0)}°`);
  }
  const gapSec = (Date.now() - last.timestamp) / 1000;
  if (gapSec > 600) anomalies.push(`No GPS update for ${Math.floor(gapSec / 60)} min`);

  let riskScore = anomalies.length * 18 + varPenalty * 25;
  if (avgSpeed > 5) riskScore += 12;
  if (gapSec > 300) riskScore += 15;
  riskScore = Math.min(100, Math.round(riskScore));
  const riskLevel: RiskLevel =
    riskScore >= 70 ? 'high' :
    riskScore >= 40 ? 'moderate' :
    riskScore >= 15 ? 'low' : 'safe';

  return {
    points: predicted,
    nextPosition: predicted[0],
    bearing: lastBearing,
    avgSpeed,
    confidence: baseConf,
    riskLevel,
    riskScore,
    anomalies,
    model: 'hybrid',
  };
}

/**
 * Predict. If AI_SERVICE_URL is configured, proxy to it; otherwise run locally.
 */
export async function predictTrajectory(input: PredictionInput): Promise<PredictionResult> {
  const aiUrl = process.env.AI_SERVICE_URL;
  if (!aiUrl) return predictTrajectoryLocal(input);

  try {
    const res = await fetch(`${aiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`AI service returned ${res.status}`);
    const data = (await res.json()) as PredictionResult;
    return { ...data, model: data.model ?? 'lstm' };
  } catch (err) {
    console.warn('AI microservice unreachable — falling back to local predictor.', (err as Error).message);
    return predictTrajectoryLocal(input);
  }
}

/**
 * Convert a PredictionResult into a Firestore-storable Prediction record.
 */
export function toPredictionRecord(
  ids: { petId: string; deviceId: string; ownerId: string },
  result: PredictionResult
): Omit<Prediction, 'id'> {
  return {
    ...ids,
    points: result.points,
    nextPosition: result.nextPosition,
    bearing: result.bearing,
    avgSpeed: result.avgSpeed,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    anomalies: result.anomalies,
    model: result.model,
    confidence: result.confidence,
    createdAt: Date.now(),
  };
}
