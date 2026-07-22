import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady, auth } from '../config/firebase.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', async (_req: AuthedRequest, res) => {
  if (!firebaseReady()) {
    return res.json({
      success: true,
      data: [{ uid: 'demo-user', email: 'demo@findpaw.io', role: 'admin', displayName: 'Demo User', createdAt: Date.now() }],
    });
  }

  // Firebase Auth is the source of truth for *who is registered* — every
  // signed-up account shows up here regardless of whether they've ever
  // loaded the dashboard (Firestore's `users` collection is only populated
  // lazily, the first time a user hits GET /api/auth/me, so relying on it
  // alone hides anyone who signed up but never logged in).
  const authUsers: import('firebase-admin/auth').UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth().listUsers(1000, pageToken);
    authUsers.push(...page.users);
    pageToken = page.pageToken || undefined;
  } while (pageToken);

  // Firestore holds the app-specific profile (role, custom displayName, the
  // createdAt timestamp we actually control) — merge it in by uid.
  const profileSnap = await db().collection('users').limit(1000).get();
  const profiles = new Map(profileSnap.docs.map((d) => [d.id, d.data()]));

  const merged = authUsers.map((u) => {
    const profile = profiles.get(u.uid) as Record<string, any> | undefined;
    const authCreatedAt = u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : undefined;
    return {
      uid: u.uid,
      email: u.email ?? profile?.email ?? '',
      displayName: profile?.displayName ?? u.displayName ?? (u.email ? u.email.split('@')[0] : 'User'),
      // Custom claims (set via /api/auth/role) are the authoritative role source;
      // fall back to the Firestore profile, then default to 'user'.
      role: (u.customClaims as any)?.role ?? profile?.role ?? 'user',
      // Prefer our own createdAt if we have one; otherwise fall back to
      // Firebase Auth's own account-creation timestamp so "Joined" is never
      // blank just because the user hasn't triggered a profile doc yet.
      createdAt: profile?.createdAt ?? authCreatedAt ?? null,
      disabled: u.disabled,
    };
  });

  res.json({ success: true, data: merged });
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
  const collections = ['pets', 'devices', 'alerts', 'gps_logs', 'predictions'] as const;
  const counts: Record<string, number> = {};
  await Promise.all(
    collections.map(async (c) => {
      const snap = await db().collection(c).count().get();
      counts[c] = snap.data().count;
    })
  );

  // Count real registered accounts via Firebase Auth (not the lazily-created
  // Firestore `users` collection) so this matches what GET /api/admin/users returns.
  let userCount = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth().listUsers(1000, pageToken);
    userCount += page.users.length;
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  counts.users = userCount;

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