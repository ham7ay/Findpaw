// =================================================================
// Find🐾 — Firestore seed script
// Usage: cd server && npm run seed
// =================================================================
// Populates Firestore with one demo user, three pets, three devices,
// and ~200 GPS logs around Lahore (31.5204, 74.3587). Safe to re-run:
// existing demo documents are deleted first.
// =================================================================

import 'dotenv/config';
import { initFirebase, firebaseReady, db, auth } from '../config/firebase.js';
import { hashDeviceKey } from '../middleware/deviceAuth.js';

async function main() {
  initFirebase();
  if (!firebaseReady()) {
    console.error('❌ Firebase not configured. Add credentials to server/.env first.');
    process.exit(1);
  }

  console.log('🌱 Seeding Find🐾 demo data...');

  // ── 1. Demo user ────────────────────────────────────────────────
  let uid: string;
  try {
    const existing = await auth().getUserByEmail('demo@findpaw.io');
    uid = existing.uid;
    console.log(`   • Using existing demo user (${uid})`);
  } catch {
    const created = await auth().createUser({
      email: 'demo@findpaw.io',
      password: 'FindPaw2026!',
      displayName: 'Demo User',
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`   • Created demo user (${uid})`);
  }
  await auth().setCustomUserClaims(uid, { role: 'admin' });

  await db().collection('users').doc(uid).set({
    uid,
    email: 'demo@findpaw.io',
    displayName: 'Demo User',
    role: 'admin',
    createdAt: Date.now(),
  });

  // ── 2. Wipe existing demo docs ──────────────────────────────────
  const wipeCols = ['pets', 'devices', 'gps_logs', 'predictions', 'alerts', 'geofences'];
  for (const c of wipeCols) {
    const snap = await db().collection(c).where('ownerId', '==', uid).get();
    if (!snap.empty) {
      const batch = db().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`   • Cleared ${snap.size} old ${c}`);
    }
  }

  // ── 3. Pets ────────────────────────────────────────────────────
  const pets = [
    { name: 'Luna', species: 'dog', breed: 'Golden Retriever', age: 4, weight: 28, color: 'Cream' },
    { name: 'Kiwi', species: 'bird', breed: 'African Grey Parrot', age: 7, weight: 0.4, color: 'Grey with red tail' },
    { name: 'Mocha', species: 'cat', breed: 'Bengal', age: 3, weight: 5, color: 'Tabby' },
  ];
  const petIds: string[] = [];
  for (const p of pets) {
    const ref = await db().collection('pets').add({ ...p, ownerId: uid, createdAt: Date.now() });
    petIds.push(ref.id);
  }
  console.log(`   • Created ${pets.length} pets`);

  // ── 4. Devices (one per pet) ────────────────────────────────────
  const rawKeys: { serial: string; rawKey: string }[] = [];
  for (let i = 0; i < pets.length; i++) {
    const rawKey = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const serial = `FP-A8X-${(200 + i * 100).toString().padStart(3, '0')}`;
    await db().collection('devices').add({
      ownerId: uid,
      petId: petIds[i],
      serial,
      status: i === 1 ? 'low_battery' : 'online',
      battery: i === 1 ? 18 : 87 - i * 5,
      lastSync: Date.now() - i * 2000,
      firmware: 'v2.4.1',
      apiKey: hashDeviceKey(rawKey),
      createdAt: Date.now(),
    });
    rawKeys.push({ serial, rawKey });
  }
  console.log(`   • Created ${pets.length} devices`);

  // ── 5. GPS history around Lahore ────────────────────────────────
  let lat = 31.5204;
  let lng = 74.3587;
  let heading = Math.random() * 360;
  let speed = 1.0;
  const stepSec = 30;
  const count = 200;
  const now = Date.now();

  const batch = db().batch();
  const col = db().collection('gps_logs');
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.08) heading += (Math.random() - 0.5) * 120;
    else heading += (Math.random() - 0.5) * 30;
    if (Math.random() < 0.1) speed = Math.max(0, speed + (Math.random() - 0.5) * 2);

    const distance = speed * stepSec;
    const dLat = (distance * Math.cos((heading * Math.PI) / 180)) / 111111;
    const dLng = (distance * Math.sin((heading * Math.PI) / 180)) / (111111 * Math.cos((lat * Math.PI) / 180));
    lat += dLat;
    lng += dLng;

    const ref = col.doc();
    batch.set(ref, {
      deviceId: 'seed',
      petId: petIds[0], // Luna
      ownerId: uid,
      lat,
      lng,
      speed,
      bearing: (heading + 360) % 360,
      accuracy: 5 + Math.random() * 8,
      altitude: 210 + Math.random() * 10,
      battery: Math.max(40, 90 - i * 0.2),
      timestamp: now - (count - i) * stepSec * 1000,
    });
  }
  await batch.commit();
  console.log(`   • Created ${count} GPS logs for Luna`);

  // ── 6. Sample alerts ────────────────────────────────────────────
  const alerts = [
    { type: 'geofence_exit', severity: 'high', title: 'Luna left Home zone', message: 'Luna crossed the boundary 8 minutes ago.', read: false },
    { type: 'low_battery', severity: 'medium', title: 'Kiwi device low battery', message: 'Battery at 18%. Charge before tomorrow.', read: false },
    { type: 'abnormal_movement', severity: 'medium', title: 'Unusual activity for Mocha', message: 'AI flagged speed spike at 04:12.', read: true },
    { type: 'inactive', severity: 'low', title: 'No signal from Luna', message: 'No GPS update for 11 minutes.', read: true },
  ];
  for (const a of alerts) {
    await db().collection('alerts').add({
      ...a,
      ownerId: uid,
      petId: petIds[0],
      createdAt: Date.now() - Math.random() * 86400000,
    });
  }
  console.log(`   • Created ${alerts.length} alerts`);

  // ── 7. Sample geofence ──────────────────────────────────────────
  await db().collection('geofences').add({
    ownerId: uid,
    petId: petIds[0],
    name: 'Home',
    center: { lat: 31.5204, lng: 74.3587 },
    radius: 200,
    isSafeZone: true,
    active: true,
    createdAt: Date.now(),
  });
  console.log('   • Created 1 geofence (Home, 200m)');

  console.log('\n✅ Seed complete.');
  console.log('\n──────────────────────────────────────────────────────');
  console.log('  Login:    demo@findpaw.io / FindPaw2026!');
  console.log('  UID:      ', uid);
  console.log('──────────────────────────────────────────────────────');
  console.log('  Device API keys (save now — not retrievable later):');
  rawKeys.forEach((k) => console.log(`    ${k.serial}: ${k.rawKey}`));
  console.log('──────────────────────────────────────────────────────\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
