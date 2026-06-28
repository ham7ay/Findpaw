import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { requireDevice, type DeviceRequest } from '../middleware/deviceAuth.js';
import { db, firebaseReady, admin } from '../config/firebase.js';
import { ApiError } from '../middleware/errorHandler.js';
import { emitGpsUpdate, emitAlert } from '../services/socketService.js';
import { checkGeofenceBreach } from '../services/geofenceService.js';
import type { Geofence } from '../../../shared/types.js';

const router = Router();

const uploadSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  speed: z.number().nonnegative().default(0),
  bearing: z.number().min(0).max(360).default(0),
  accuracy: z.number().nonnegative().default(0),
  altitude: z.number().optional(),
  battery: z.number().min(0).max(100).optional(),
  timestamp: z.number().int().positive().optional(),
});

const batchSchema = z.object({
  logs: z.array(uploadSchema).min(1).max(100),
});

// In-memory demo store
const demoLogs: any[] = [];

/**
 * POST /api/gps/upload
 * Device-authenticated endpoint for a single GPS fix.
 * Headers: X-Device-Id, X-Device-Key
 */
router.post('/upload', requireDevice, async (req: DeviceRequest, res) => {
  const data = uploadSchema.parse(req.body);
  const device = req.device!;
  const log = {
    deviceId: device.id,
    petId: device.petId,
    ownerId: device.ownerId,
    ...data,
    timestamp: data.timestamp ?? Date.now(),
  };

  if (!firebaseReady()) {
    const newLog = { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...log };
    demoLogs.push(newLog);
    if (device.petId) emitGpsUpdate(device.petId, newLog);
    return res.status(201).json({ success: true, data: newLog });
  }

  const ref = await db().collection('gps_logs').add(log);
  const newLog = { id: ref.id, ...log };

  // Update device lastSync + battery
  await db().collection('devices').doc(device.id).update({
    lastSync: log.timestamp,
    battery: log.battery ?? admin.firestore.FieldValue.delete(),
    status: 'online',
  });

  // Emit live update
  if (device.petId) emitGpsUpdate(device.petId, newLog);

  // Geofence check (best-effort, non-blocking failure)
  if (device.petId) {
    try {
      const geofencesSnap = await db()
        .collection('geofences')
        .where('petId', '==', device.petId)
        .where('active', '==', true)
        .get();
      const geofences: Geofence[] = geofencesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Geofence));

      const prevSnap = await db()
        .collection('gps_logs')
        .where('petId', '==', device.petId)
        .orderBy('timestamp', 'desc')
        .limit(2)
        .get();
      const previous = prevSnap.docs[1]?.data() as { lat: number; lng: number } | undefined;

      const events = checkGeofenceBreach(previous ?? null, { lat: log.lat, lng: log.lng }, geofences);
      for (const ev of events) {
        const alert = {
          ownerId: device.ownerId,
          petId: device.petId,
          deviceId: device.id,
          type: ev.type === 'enter' ? 'geofence_enter' : 'geofence_exit',
          severity: ev.isSafeZone && ev.type === 'exit' ? 'high' : 'medium',
          title: `${ev.type === 'enter' ? 'Entered' : 'Left'} ${ev.geofenceName}`,
          message: `Pet ${ev.type === 'enter' ? 'entered' : 'exited'} the geofence "${ev.geofenceName}".`,
          read: false,
          metadata: { geofenceId: ev.geofenceId, lat: log.lat, lng: log.lng },
          createdAt: Date.now(),
        };
        const alertRef = await db().collection('alerts').add(alert);
        emitAlert(device.petId, { id: alertRef.id, ...alert });
      }
    } catch (err) {
      console.warn('[gps] geofence check failed:', (err as Error).message);
    }
  }

  res.status(201).json({ success: true, data: newLog });
});

/**
 * POST /api/gps/batch — bulk upload from intermittent devices
 */
router.post('/batch', requireDevice, async (req: DeviceRequest, res) => {
  const { logs } = batchSchema.parse(req.body);
  const device = req.device!;

  if (!firebaseReady()) {
    const created = logs.map((l) => ({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deviceId: device.id,
      petId: device.petId,
      ownerId: device.ownerId,
      ...l,
      timestamp: l.timestamp ?? Date.now(),
    }));
    demoLogs.push(...created);
    return res.status(201).json({ success: true, data: { count: created.length } });
  }

  const batch = db().batch();
  const col = db().collection('gps_logs');
  for (const l of logs) {
    const ref = col.doc();
    batch.set(ref, {
      deviceId: device.id,
      petId: device.petId,
      ownerId: device.ownerId,
      ...l,
      timestamp: l.timestamp ?? Date.now(),
    });
  }
  await batch.commit();
  res.status(201).json({ success: true, data: { count: logs.length } });
});

/**
 * GET /api/gps/:petId?limit=200&since=<timestamp>
 * User-authenticated: history fetch for one pet.
 */
router.get('/:petId', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const petId = req.params.petId;
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const since = req.query.since ? parseInt(req.query.since as string) : undefined;

  if (!firebaseReady()) {
    const all = demoLogs
      .filter((l) => l.petId === petId && l.ownerId === ownerId)
      .filter((l) => (since ? l.timestamp >= since : true))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit);
    return res.json({ success: true, data: all });
  }

  // Verify pet ownership
  const petSnap = await db().collection('pets').doc(petId).get();
  if (!petSnap.exists || petSnap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Pet not found');
  }

  let q = db().collection('gps_logs')
    .where('petId', '==', petId)
    .orderBy('timestamp', 'desc')
    .limit(limit);
  if (since) q = q.where('timestamp', '>=', since) as any;

  const snap = await q.get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
  res.json({ success: true, data });
});

export default router;
