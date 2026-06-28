import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let initialized = false;

export function initFirebase(): boolean {
  if (initialized) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '⚠️  Firebase env not configured — running in DEMO MODE. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env to enable Firestore.'
    );
    return false;
  }

  if (privateKey.includes('REPLACE_ME')) {
    console.warn('⚠️  FIREBASE_PRIVATE_KEY looks like the placeholder — running in DEMO MODE.');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    initialized = true;
    console.log(`✅ Firebase Admin initialized for project: ${projectId}`);
    return true;
  } catch (err) {
    console.error('❌ Firebase init failed:', (err as Error).message);
    return false;
  }
}

export function firebaseReady(): boolean {
  return initialized;
}

export const db = () => admin.firestore();
export const auth = () => admin.auth();
export { admin };
