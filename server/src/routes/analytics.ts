import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady } from '../config/firebase.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { GpsLog } from '../../../shared/types.js';

const router = Router();

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

/**
 * GET /api/analytics/:petId?days=7
 * Daily summaries: distance, active minutes, top speed, hourly activity.
 */
router.get('/:petId', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const petId = req.params.petId;
  const days = Math.min(parseInt(req.query.days as string) || 7, 90);
  const since = Date.now() - days * 86400000;

  if (!firebaseReady()) {
    // Return synthetic-but-deterministic stats so the UI demos
    return res.json({ success: true, data: makeDemoAnalytics(petId, days) });
  }

  const petSnap = await db().collection('pets').doc(petId).get();
  if (!petSnap.exists || petSnap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Pet not found');
  }

  const snap = await db().collection('gps_logs')
    .where('petId', '==', petId)
    .where('timestamp', '>=', since)
    .orderBy('timestamp', 'asc')
    .get();

  const logs = snap.docs.map((d) => d.data() as GpsLog);
  res.json({ success: true, data: aggregate(logs, days) });
});

function aggregate(logs: GpsLog[], days: number) {
  const daily = new Map<string, { distance: number; activeSec: number; topSpeed: number; sumSpeed: number; count: number }>();
  const hourly = new Array(24).fill(0).map(() => ({ activity: 0, samples: 0 }));

  for (let i = 1; i < logs.length; i++) {
    const a = logs[i - 1];
    const b = logs[i];
    const dt = (b.timestamp - a.timestamp) / 1000;
    if (dt <= 0 || dt > 600) continue; // skip large gaps
    const d = haversine(a, b);
    const day = new Date(b.timestamp).toISOString().slice(0, 10);
    const hour = new Date(b.timestamp).getHours();
    const cur = daily.get(day) ?? { distance: 0, activeSec: 0, topSpeed: 0, sumSpeed: 0, count: 0 };
    cur.distance += d;
    if (b.speed > 0.3) cur.activeSec += dt;
    cur.topSpeed = Math.max(cur.topSpeed, b.speed);
    cur.sumSpeed += b.speed;
    cur.count += 1;
    daily.set(day, cur);
    hourly[hour].activity += b.speed > 0.3 ? 1 : 0;
    hourly[hour].samples += 1;
  }

  return {
    daily: Array.from(daily.entries()).map(([date, v]) => ({
      date,
      distance: +(v.distance / 1000).toFixed(2),    // km
      activeMinutes: Math.round(v.activeSec / 60),
      topSpeed: +(v.topSpeed * 3.6).toFixed(1),     // km/h
      avgSpeed: +(((v.sumSpeed / Math.max(v.count, 1)) * 3.6).toFixed(1)),
    })),
    hourly: hourly.map((h, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      activity: h.samples > 0 ? Math.round((h.activity / h.samples) * 100) : 0,
    })),
    totalDistanceKm: +(Array.from(daily.values()).reduce((a, v) => a + v.distance, 0) / 1000).toFixed(2),
    totalActiveMin: Array.from(daily.values()).reduce((a, v) => a + v.activeSec, 0) / 60 | 0,
  };
}

function makeDemoAnalytics(petId: string, days: number) {
  let seed = petId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toISOString().slice(0, 10),
      distance: +(rand() * 8 + 2).toFixed(1),
      activeMinutes: Math.round(rand() * 180 + 60),
      avgSpeed: +(rand() * 3 + 1).toFixed(1),
      topSpeed: +(rand() * 6 + 3).toFixed(1),
    };
  });
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    activity: Math.round(rand() * 100 * (h >= 6 && h <= 9 ? 1.5 : h >= 17 && h <= 20 ? 1.3 : 0.7)),
  }));
  return {
    daily,
    hourly,
    totalDistanceKm: +daily.reduce((s, d) => s + d.distance, 0).toFixed(1),
    totalActiveMin: daily.reduce((s, d) => s + d.activeMinutes, 0),
  };
}

export default router;
