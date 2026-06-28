import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady } from '../config/firebase.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

const geofenceSchema = z.object({
  name: z.string().min(1).max(60),
  petId: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
  radius: z.number().positive().max(50000),
  isSafeZone: z.boolean().default(true),
  active: z.boolean().default(true),
});

const demoStore: any[] = [];

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const petId = req.query.petId as string | undefined;
  if (!firebaseReady()) {
    let data = demoStore.filter((g) => g.ownerId === ownerId);
    if (petId) data = data.filter((g) => g.petId === petId);
    return res.json({ success: true, data });
  }
  let q = db().collection('geofences').where('ownerId', '==', ownerId);
  if (petId) q = q.where('petId', '==', petId) as any;
  const snap = await q.get();
  res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const body = geofenceSchema.parse(req.body);
  const fence = { ...body, ownerId, createdAt: Date.now() };
  if (!firebaseReady()) {
    const newFence = { id: `gf-${Date.now()}`, ...fence };
    demoStore.push(newFence);
    return res.status(201).json({ success: true, data: newFence });
  }
  const ref = await db().collection('geofences').add(fence);
  res.status(201).json({ success: true, data: { id: ref.id, ...fence } });
});

router.put('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const partial = geofenceSchema.partial().parse(req.body);
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((g) => g.id === req.params.id && g.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Geofence not found');
    demoStore[idx] = { ...demoStore[idx], ...partial };
    return res.json({ success: true, data: demoStore[idx] });
  }
  const ref = db().collection('geofences').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Geofence not found');
  }
  await ref.update(partial);
  const updated = await ref.get();
  res.json({ success: true, data: { id: updated.id, ...updated.data() } });
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((g) => g.id === req.params.id && g.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Geofence not found');
    demoStore.splice(idx, 1);
    return res.json({ success: true });
  }
  const ref = db().collection('geofences').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Geofence not found');
  }
  await ref.delete();
  res.json({ success: true });
});

export default router;
