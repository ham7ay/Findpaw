import type { Request, Response, NextFunction } from 'express';
import { auth, firebaseReady } from '../config/firebase.js';

export interface AuthedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

/**
 * Verify a Firebase ID token from the `Authorization: Bearer <token>` header.
 * In demo mode (Firebase not configured), all requests are allowed with a demo user.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Demo mode bypass
  if (!firebaseReady()) {
    req.user = { uid: 'demo-user', email: 'demo@findpaw.io', role: 'admin' };
    return next();
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  try {
    const decoded = await auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded as any).role ?? 'user',
    };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid ID token' });
  }
}

/**
 * Restrict to admin role.
 */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
