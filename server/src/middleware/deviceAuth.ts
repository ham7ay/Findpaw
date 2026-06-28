import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, firebaseReady } from '../config/firebase.js';

export interface DeviceRequest extends Request {
  device?: {
    id: string;
    petId?: string;
    ownerId: string;
  };
}

const SALT = process.env.DEVICE_KEY_SALT ?? 'demo-salt';

export function hashDeviceKey(rawKey: string): string {
  return crypto.createHash('sha256').update(`${SALT}:${rawKey}`).digest('hex');
}

/**
 * GPS-uploading devices authenticate with two headers:
 *   X-Device-Id:  <document id from devices collection>
 *   X-Device-Key: <raw API key issued once at registration>
 *
 * The hashed key is compared against the stored `apiKey` field on the device doc.
 */
export async function requireDevice(req: DeviceRequest, res: Response, next: NextFunction) {
  const deviceId = req.headers['x-device-id'] as string | undefined;
  const deviceKey = req.headers['x-device-key'] as string | undefined;

  if (!deviceId || !deviceKey) {
    return res.status(401).json({ success: false, error: 'Missing X-Device-Id or X-Device-Key' });
  }

  // Demo bypass
  if (!firebaseReady()) {
    req.device = { id: deviceId, ownerId: 'demo-user' };
    return next();
  }

  try {
    const snap = await db().collection('devices').doc(deviceId).get();
    if (!snap.exists) {
      return res.status(401).json({ success: false, error: 'Unknown device' });
    }
    const data = snap.data()!;
    const expected = data.apiKey;
    const actual = hashDeviceKey(deviceKey);

    if (expected !== actual) {
      return res.status(401).json({ success: false, error: 'Invalid device key' });
    }

    req.device = { id: deviceId, petId: data.petId, ownerId: data.ownerId };
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Device auth failed' });
  }
}
