import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady } from '../config/firebase.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

const petSchema = z.object({
  name: z.string().min(1).max(60),
  species: z.enum(['dog', 'cat', 'bird', 'cattle', 'other']),
  breed: z.string().max(80).optional(),
  age: z.number().int().nonnegative().optional(),
  weight: z.number().positive().optional(),
  color: z.string().max(40).optional(),
  imageUrl: z.string().url().optional(),
  medicalNotes: z.string().max(500).optional(),
  deviceId: z.string().optional(),
});

// Simple in-memory store for demo mode
const demoStore: any[] = [];

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    return res.json({ success: true, data: demoStore.filter((p) => p.ownerId === ownerId) });
  }
  const snap = await db().collection('pets').where('ownerId', '==', ownerId).get();
  res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const data = petSchema.parse(req.body);
  const pet = { ...data, ownerId, createdAt: Date.now() };

  if (!firebaseReady()) {
    const newPet = { id: `pet-${Date.now()}`, ...pet };
    demoStore.push(newPet);
    return res.status(201).json({ success: true, data: newPet });
  }

  const ref = await db().collection('pets').add(pet);
  res.status(201).json({ success: true, data: { id: ref.id, ...pet } });
});

router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    const pet = demoStore.find((p) => p.id === req.params.id && p.ownerId === ownerId);
    if (!pet) throw new ApiError(404, 'Pet not found');
    return res.json({ success: true, data: pet });
  }
  const snap = await db().collection('pets').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Pet not found');
  const data = snap.data()!;
  if (data.ownerId !== ownerId) throw new ApiError(403, 'Not your pet');
  res.json({ success: true, data: { id: snap.id, ...data } });
});

router.put('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const partial = petSchema.partial().parse(req.body);
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((p) => p.id === req.params.id && p.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Pet not found');
    demoStore[idx] = { ...demoStore[idx], ...partial };
    return res.json({ success: true, data: demoStore[idx] });
  }
  const ref = db().collection('pets').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Pet not found');
  }
  await ref.update(partial);
  const updated = await ref.get();
  res.json({ success: true, data: { id: updated.id, ...updated.data() } });
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((p) => p.id === req.params.id && p.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Pet not found');
    demoStore.splice(idx, 1);
    return res.json({ success: true });
  }
  const ref = db().collection('pets').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Pet not found');
  }
  await ref.delete();
  res.json({ success: true });
});

export default router;
