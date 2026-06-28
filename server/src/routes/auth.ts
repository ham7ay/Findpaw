import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady, auth as fbAuth } from '../config/firebase.js';

const router = Router();

/**
 * GET /api/auth/me
 * Return the authenticated user's profile (creating it if missing).
 */
router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  if (!firebaseReady()) {
    return res.json({
      success: true,
      data: { uid: 'demo-user', email: 'demo@findpaw.io', role: 'admin', displayName: 'Demo User' },
    });
  }

  const uid = req.user!.uid;
  const ref = db().collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile = {
      uid,
      email: req.user!.email,
      role: 'user',
      displayName: req.user!.email?.split('@')[0] ?? 'User',
      createdAt: Date.now(),
    };
    await ref.set(profile);
    return res.json({ success: true, data: profile });
  }
  res.json({ success: true, data: snap.data() });
});

/**
 * POST /api/auth/role
 * Admin-only: promote/demote a user.
 */
router.post('/role', requireAuth, async (req: AuthedRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }
  const { uid, role } = req.body;
  if (!uid || !['admin', 'user'].includes(role)) {
    return res.status(400).json({ success: false, error: 'uid and role (admin|user) required' });
  }
  if (firebaseReady()) {
    await fbAuth().setCustomUserClaims(uid, { role });
    await db().collection('users').doc(uid).update({ role });
  }
  res.json({ success: true });
});

export default router;
