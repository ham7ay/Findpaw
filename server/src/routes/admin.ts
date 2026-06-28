import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady, auth } from '../config/firebase.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', async (_req: AuthedRequest, res) => {
  if (!firebaseReady()) {
    return res.json({ success: true, data: [{ uid: 'demo-user', email: 'demo@findpaw.io', role: 'admin' }] });
  }
  const snap = await db().collection('users').limit(200).get();
  res.json({ success: true, data: snap.docs.map((d) => d.data()) });
});

router.get('/devices', async (_req: AuthedRequest, res) => {
  if (!firebaseReady()) return res.json({ success: true, data: [] });
  const snap = await db().collection('devices').limit(500).get();
  res.json({
    success: true,
    data: snap.docs.map((d) => {
      const { apiKey, ...rest } = d.data();
      return { id: d.id, ...rest };
    }),
  });
});

router.get('/stats', async (_req: AuthedRequest, res) => {
  if (!firebaseReady()) {
    return res.json({
      success: true,
      data: { users: 1, pets: 3, devices: 3, alerts: 4, gpsLogs: 0, predictions: 0 },
    });
  }
  const collections = ['users', 'pets', 'devices', 'alerts', 'gps_logs', 'predictions'] as const;
  const counts: Record<string, number> = {};
  await Promise.all(
    collections.map(async (c) => {
      const snap = await db().collection(c).count().get();
      counts[c] = snap.data().count;
    })
  );
  res.json({ success: true, data: counts });
});

router.delete('/users/:uid', async (req: AuthedRequest, res) => {
  if (firebaseReady()) {
    await auth().deleteUser(req.params.uid);
    await db().collection('users').doc(req.params.uid).delete();
  }
  res.json({ success: true });
});

export default router;
