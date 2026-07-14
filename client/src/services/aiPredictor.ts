// =================================================================
// Find🐾 — AI TRAJECTORY PREDICTION ENGINE (client-side fallback)
// =================================================================
// This module forecasts an animal's near-future positions from its
// recent GPS history. It runs entirely in the browser so the system
// stays functional when the optional Python LSTM microservice is down.
//
// Approach (hybrid):
//   1. Convert (lat, lng) pairs into local-tangent-plane meters so we
//      can use Euclidean geometry safely at small scales.
//   2. Fit linear regression on the x(t) and y(t) series — very
//      stable for short horizons and animals that move in bursts.
//   3. Use Exponentially Weighted Moving Average for velocity/bearing
//      to reflect recent behavior more than ancient history.
//   4. Detect anomalies (sudden direction reversal, speed spikes,
//      long inactivity) and map them to a risk score.
//   5. Output predicted points with per-step confidence that decays
//      with horizon distance and history variance.
// =================================================================

import type { GpsLog, Prediction, PredictedPoint, RiskLevel } from '@shared/types';
import { haversine, bearing } from "../lib/utils";

// Project lat/lng into local meters around an anchor (equirectangular,
// fine for the small windows the predictor uses).
function toLocalXY(p: { lat: number; lng: number }, anchor: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x = R * toRad(p.lng - anchor.lng) * Math.cos(toRad(anchor.lat));
  const y = R * toRad(p.lat - anchor.lat);
  return { x, y };
}

function fromLocalXY(p: { x: number; y: number }, anchor: { lat: number; lng: number }) {
  const R = 6371000;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat = anchor.lat + toDeg(p.y / R);
  const lng = anchor.lng + toDeg(p.x / (R * Math.cos((anchor.lat * Math.PI) / 180)));
  return { lat, lng };
}

// Simple ordinary-least-squares for y = a + b*x. Returns [intercept, slope].
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
  const intercept = (sumY - slope * sumX) / n;
  return [intercept, slope];
}

function ewma(values: number[], alpha = 0.4): number {
  if (values.length === 0) return 0;
  let v = values[0];
  for (let i = 1; i < values.length; i++) v = alpha * values[i] + (1 - alpha) * v;
  return v;
}

// Standard deviation
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sq = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(sq);
}

export interface PredictionInput {
  /** Most recent N GPS records, ordered oldest → newest. Use either `logs` or `points`. */
  logs?: GpsLog[];
  /** Alias for `logs`: a lightweight shape accepted by the UI layer. */
  points?: { lat: number; lng: number; timestamp: number; speed?: number; bearing?: number }[];
  /** How many future steps to forecast (default 8). Ignored if `horizonMinutes` is set. */
  horizonSteps?: number;
  /** Total forecast window in minutes — converted to `horizonSteps` using `stepSeconds`. */
  horizonMinutes?: number;
  /** Seconds between steps (default 60). */
  stepSeconds?: number;
}

export interface PredictionResult {
  points: PredictedPoint[];
  nextPosition: PredictedPoint;
  bearing: number;
  avgSpeed: number;        // m/s
  confidence: number;      // overall 0..1
  riskLevel: RiskLevel;
  riskScore: number;       // 0..100
  anomalies: string[];
  model: 'linear' | 'lstm' | 'hybrid';
}

/**
 * Run trajectory prediction. Requires at least 3 GPS points.
 * For 0–2 points returns a low-confidence stationary forecast.
 */
export function predictTrajectory(input: PredictionInput): PredictionResult {
  // Normalize input — accept full `logs` or lightweight `points`.
  const raw = input.logs ?? input.points ?? [];
  const logs: GpsLog[] = raw
    .map((p: any, i: number): GpsLog => ({
      id: p.id ?? `pt-${i}`,
      deviceId: p.deviceId ?? '',
      petId: p.petId,
      ownerId: p.ownerId ?? '',
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy ?? 0,
      speed: p.speed ?? 0,
      bearing: p.bearing ?? 0,
      altitude: p.altitude ?? 0,
      battery: p.battery ?? 100,
      timestamp: p.timestamp,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const stepSec = input.stepSeconds ?? 60;
  const horizon =
    input.horizonSteps ??
    (input.horizonMinutes !== undefined
      ? Math.max(1, Math.round((input.horizonMinutes * 60) / stepSec))
      : 8);

  if (logs.length === 0) {
    return emptyPrediction();
  }

  const last = logs[logs.length - 1];
  const anchor = { lat: last.lat, lng: last.lng };

  // Sparse history → return stationary prediction with low confidence
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

  // Project history into local meters relative to most recent point.
  const points = logs.map((l) => ({
    t: (l.timestamp - logs[0].timestamp) / 1000, // seconds since first log
    ...toLocalXY({ lat: l.lat, lng: l.lng }, anchor),
    speed: l.speed,
    bearing: l.bearing,
    timestamp: l.timestamp,
  }));

  const ts = points.map((p) => p.t);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  // ---- Linear regression on x(t) and y(t) ----
  const [ax, bx] = linearRegression(ts, xs);
  const [ay, by] = linearRegression(ts, ys);

  // ---- Recent-weighted velocity (smoother near-term) ----
  // A single noisy fix (common on a phone's first GPS lock) can register as
  // a huge instantaneous speed, which would otherwise get extrapolated in a
  // straight line for the whole horizon. Clip individual speed samples to a
  // plausible ceiling before they feed into the EWMA / dead-reckoning below.
  const MAX_PLAUSIBLE_SPEED = 15; // m/s (~54 km/h) — generous for a running dog/livestock
  const speeds: number[] = [];
  const bearings: number[] = [];
  for (let i = 1; i < logs.length; i++) {
    const dt = (logs[i].timestamp - logs[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;
    const d = haversine(logs[i - 1], logs[i]);
    speeds.push(Math.min(d / dt, MAX_PLAUSIBLE_SPEED));
    bearings.push(bearing(logs[i - 1], logs[i]));
  }
  const avgSpeed = ewma(speeds);
  const lastBearing = bearings[bearings.length - 1] ?? 0;
  const smoothBearing = ewma(bearings);

  // ---- Generate future predictions ----
  const baseT = points[points.length - 1].t;
  const predicted: PredictedPoint[] = [];

  // Confidence decays with horizon and grows with history variance
  const speedSd = stdev(speeds);
  const bearingSd = stdev(bearings);
  // Higher variance => lower base confidence
  const varPenalty = Math.min(1, (speedSd / Math.max(avgSpeed, 0.5) + bearingSd / 180) / 2);
  const baseConf = Math.max(0.35, 0.92 - varPenalty * 0.5);

  // Blend regression projection with bearing/speed-based dead reckoning
  // (linear regression captures long trend, dead-reckoning the recent intent)
  const drBearingRad = (smoothBearing * Math.PI) / 180;
  const drVx = Math.sin(drBearingRad) * avgSpeed;
  const drVy = Math.cos(drBearingRad) * avgSpeed;

  for (let i = 1; i <= horizon; i++) {
    const t = baseT + i * stepSec;
    // Regression prediction
    const xReg = ax + bx * t;
    const yReg = ay + by * t;

    // Dead-reckoning from current position
    const xDr = points[points.length - 1].x + drVx * i * stepSec;
    const yDr = points[points.length - 1].y + drVy * i * stepSec;

    // Weighted blend — favor DR for near term, regression for longer term
    const w = Math.min(1, i / horizon); // 0 near → 1 far
    const x = xDr * (1 - w) + xReg * w;
    const y = yDr * (1 - w) + yReg * w;

    const latlng = fromLocalXY({ x, y }, anchor);
    const confidence = Math.max(0.15, baseConf * Math.pow(0.93, i - 1));

    predicted.push({
      lat: latlng.lat,
      lng: latlng.lng,
      timestamp: last.timestamp + i * stepSec * 1000,
      confidence,
      tOffsetSec: i * stepSec,
    });
  }

  // ---- Anomaly detection ----
  const anomalies: string[] = [];

  // Speed spike: recent speed > 2.5x median
  const sortedSpeeds = [...speeds].sort((a, b) => a - b);
  const medianSpeed = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)] || 0;
  const recentSpeed = speeds[speeds.length - 1] ?? 0;
  if (medianSpeed > 0 && recentSpeed > medianSpeed * 2.5) {
    anomalies.push(`Speed spike detected (${recentSpeed.toFixed(1)} m/s vs median ${medianSpeed.toFixed(1)} m/s)`);
  }

  // Direction reversal: last two bearings differ by >120°
  if (bearings.length >= 2) {
    const b1 = bearings[bearings.length - 2];
    const b2 = bearings[bearings.length - 1];
    const diff = Math.min(Math.abs(b1 - b2), 360 - Math.abs(b1 - b2));
    if (diff > 120) anomalies.push(`Sharp direction reversal (Δ=${diff.toFixed(0)}°)`);
  }

  // Long inactivity gap
  const gapSec = (Date.now() - last.timestamp) / 1000;
  if (gapSec > 600) anomalies.push(`No GPS update for ${Math.floor(gapSec / 60)} min`);

  // ---- Risk scoring ----
  let riskScore = 0;
  riskScore += anomalies.length * 18;
  riskScore += varPenalty * 25;
  if (avgSpeed > 5) riskScore += 12;        // fast moving (escaping?)
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

function emptyPrediction(): PredictionResult {
  const now = Date.now();
  return {
    points: [],
    nextPosition: { lat: 0, lng: 0, timestamp: now, confidence: 0 },
    bearing: 0,
    avgSpeed: 0,
    confidence: 0,
    riskLevel: 'safe',
    riskScore: 0,
    anomalies: ['No GPS data available'],
    model: 'linear',
  };
}

/**
 * Convenience: take a Prediction result and turn it into a Prediction
 * record matching the shared schema (for caching/display).
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