import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { db, firebaseReady } from '../config/firebase.js';
import { predictTrajectory, toPredictionRecord } from '../services/aiPredictor.js';
import { emitPredictionUpdate } from '../services/socketService.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { GpsLog } from '../../../shared/types.js';

const router = Router();

const querySchema = z.object({
  horizonSteps: z.coerce.number().int().min(1).max(60).default(8),
  stepSeconds: z.coerce.number().int().min(10).max(300).default(60),
  historyLimit: z.coerce.number().int().min(3).max(500).default(120),
});

/**
 * POST /api/predictions/:petId/run
 * Pull recent GPS history, run the predictor, persist + return the result.
 */
router.post('/:petId/run', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const petId = req.params.petId;
  const { horizonSteps, stepSeconds, historyLimit } = querySchema.parse({ ...req.query, ...req.body });

  let history: GpsLog[] = [];
  let deviceId = '';

  if (firebaseReady()) {
    const petSnap = await db().collection('pets').doc(petId).get();
    if (!petSnap.exists || petSnap.data()!.ownerId !== ownerId) {
      throw new ApiError(404, 'Pet not found');
    }
    deviceId = petSnap.data()!.deviceId ?? '';

    const snap = await db().collection('gps_logs')
      .where('petId', '==', petId)
      .orderBy('timestamp', 'desc')
      .limit(historyLimit)
      .get();
    history = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GpsLog)).reverse();
  }

  if (history.length === 0) {
    return res.json({
      success: true,
      data: {
        points: [],
        confidence: 0,
        riskLevel: 'safe',
        riskScore: 0,
        anomalies: ['No GPS history available'],
        model: 'linear',
      },
    });
  }

  const result = await predictTrajectory({
    logs: history,
    horizonSteps,
    stepSeconds,
  });

  // Persist the prediction
  if (firebaseReady()) {
    const record = toPredictionRecord({ petId, deviceId, ownerId }, result);
    await db().collection('predictions').add(record);
  }

  emitPredictionUpdate(petId, {
    points: result.points,
    riskLevel: result.riskLevel,
    confidence: result.confidence,
  });

  res.json({ success: true, data: result });
});

/**
 * GET /api/predictions/:petId/latest
 * Latest persisted prediction for a pet.
 */
router.get('/:petId/latest', requireAuth, async (req: AuthedRequest, res) => {
  const ownerId = req.user!.uid;
  const petId = req.params.petId;

  if (!firebaseReady()) {
    return res.json({ success: true, data: null });
  }

  const petSnap = await db().collection('pets').doc(petId).get();
  if (!petSnap.exists || petSnap.data()!.ownerId !== ownerId) {
    throw new ApiError(404, 'Pet not found');
  }

  const snap = await db().collection('predictions')
    .where('petId', '==', petId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) return res.json({ success: true, data: null });
  const d = snap.docs[0];
  res.json({ success: true, data: { id: d.id, ...d.data() } });
});

export default router;
