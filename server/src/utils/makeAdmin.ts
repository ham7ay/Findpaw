// =================================================================
// Find🐾 — promote a real account to admin
// Usage: cd server && npm run make-admin -- your-email@example.com
// =================================================================
import 'dotenv/config';
import { initFirebase, firebaseReady, db, auth } from '../config/firebase.js';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run make-admin -- your-email@example.com');
    process.exit(1);
  }

  initFirebase();
  if (!firebaseReady()) {
    console.error('❌ Firebase not configured. Add credentials to server/.env first.');
    process.exit(1);
  }

  const user = await auth().getUserByEmail(email);
  await auth().setCustomUserClaims(user.uid, { role: 'admin' });

  await db().collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
      role: 'admin',
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  console.log(`✅ ${email} (${user.uid}) is now an admin.`);
  console.log('   Log out and back in on the site for the new role to take effect.');
}

main().catch((err) => {
  console.error('❌ Failed:', err.message ?? err);
  process.exit(1);
});