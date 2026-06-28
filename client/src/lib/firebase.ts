// Firebase client initialization.
// Reads config from VITE_FIREBASE_* env vars; gracefully degrades when missing
// so the landing page still renders during local exploration.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
}

export const auth = firebaseConfigured ? getAuth(app!) : null;
export const db = firebaseConfigured ? getFirestore(app!) : null;

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

const toAuthUser = (u: FirebaseUser | null): AuthUser | null =>
  u ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL } : null;

export function onAuthChanged(cb: (u: AuthUser | null) => void) {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(toAuthUser(u)));
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) throw new Error('Firebase not configured. Set up VITE_FIREBASE_* env vars.');
  const res = await signInWithEmailAndPassword(auth, email, password);
  return toAuthUser(res.user)!;
}

export async function signupWithEmail(email: string, password: string, displayName: string) {
  if (!auth) throw new Error('Firebase not configured.');
  const res = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(res.user, { displayName });
  return toAuthUser(res.user)!;
}

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase not configured.');
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return toAuthUser(res.user)!;
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

export async function resetPassword(email: string) {
  if (!auth) throw new Error('Firebase not configured.');
  await sendPasswordResetEmail(auth, email);
}

export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}
