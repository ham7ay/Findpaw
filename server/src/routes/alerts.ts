import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady } from '../config/firebase.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
const demoStore: any[] = [];

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const unreadOnly = req.query.unread === 'true';
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  if (!firebaseReady()) {
    let data = demoStore.filter((a) => a.ownerId === ownerId);
    if (unreadOnly) data = data.filter((a) => !a.read);
    return res.json({ success: true, data: data.slice(0, limit) });
  }

  let q = db().collection('alerts')
    .where('ownerId', '==', ownerId)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  const snap = await q.get();
  let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (unreadOnly) data = data.filter((a: any) => !a.read);
  res.json({ success: true, data });
});

router.post('/:id/read', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    const a = demoStore.find((x) => x.id === req.params.id && x.ownerId === ownerId);
    if (!a) throw new ApiError(404, 'Alert not found');
    a.read = true;
    return res.json({ success: true });
  }
  const ref = db().collection('alerts').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Alert not found');
  }
  await ref.update({ read: true });
  res.json({ success: true });
});

router.post('/read-all', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    demoStore.filter((a) => a.ownerId === ownerId).forEach((a) => (a.read = true));
    return res.json({ success: true });
  }
  const snap = await db().collection('alerts')
    .where('ownerId', '==', ownerId)
    .where('read', '==', false)
    .get();
  const batch = db().batch();
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
  res.json({ success: true, data: { updated: snap.size } });
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  if (!firebaseReady()) {
    const idx = demoStore.findIndex((a) => a.id === req.params.id && a.ownerId === ownerId);
    if (idx < 0) throw new ApiError(404, 'Alert not found');
    demoStore.splice(idx, 1);
    return res.json({ success: true });
  }
  const ref = db().collection('alerts').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Alert not found');
  }
  await ref.delete();
  res.json({ success: true });
});

export default router;
