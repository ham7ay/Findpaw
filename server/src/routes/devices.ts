import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady } from '../config/firebase.js';
import { hashDeviceKey } from '../middleware/deviceAuth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

const deviceSchema = z.object({
  serial: z.string().min(3).max(40),
  petId: z.string().optional(),
  firmware: z.string().default('v1.0.0'),
});

const demoStore: any[] = [];

function generateApiKey(): string {
  return crypto.randomBytes(24).toString('hex');
}

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    return res.json({ success: true, data: demoStore.filter((d) => d.ownerId === ownerId) });
  }
  const snap = await db().collection('devices').where('ownerId', '==', ownerId).get();
  // Strip apiKey hash from response
  const data = snap.docs.map((d) => {
    const { apiKey, ...rest } = d.data();
    return { id: d.id, ...rest };
  });
  res.json({ success: true, data });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const body = deviceSchema.parse(req.body);

  // Issue raw key (shown ONCE), store hashed
  const rawKey = generateApiKey();
  const device = {
    ...body,
    ownerId,
    status: 'offline' as const,
    battery: 100,
    lastSync: Date.now(),
    apiKey: hashDeviceKey(rawKey),
    createdAt: Date.now(),
  };

  if (!firebaseReady()) {
    const newDevice = { id: `device-${Date.now()}`, ...device };
    demoStore.push(newDevice);
    const { apiKey, ...rest } = newDevice;
    return res.status(201).json({ success: true, data: { ...rest, rawKey } });
  }

  const ref = await db().collection('devices').add(device);
  const { apiKey, ...rest } = device;
  res.status(201).json({ success: true, data: { id: ref.id, ...rest, rawKey } });
});

router.post('/:id/rotate-key', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const rawKey = generateApiKey();
  const hashed = hashDeviceKey(rawKey);
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((d) => d.id === req.params.id && d.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Device not found');
    demoStore[idx].apiKey = hashed;
    return res.json({ success: true, data: { rawKey } });
  }
  const ref = db().collection('devices').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Device not found');
  }
  await ref.update({ apiKey: hashed });
  res.json({ success: true, data: { rawKey } });
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((d) => d.id === req.params.id && d.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Device not found');
    demoStore.splice(idx, 1);
    return res.json({ success: true });
  }
  const ref = db().collection('devices').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Device not found');
  }
  await ref.delete();
  res.json({ success: true });
});

export default router;
