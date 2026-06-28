# Firebase setup for Find🐾

You can skip this entirely if you only want the demo: leave `.env`
unconfigured and the app falls back to in-memory data. Follow these
steps only when you're ready to use real auth + Firestore.

## 1. Create a Firebase project

1. Open [console.firebase.google.com](https://console.firebase.google.com).
2. **Add project**, give it a name (e.g. `findpaw-fyp`), accept analytics or not.
3. Wait for provisioning to finish.

## 2. Enable Authentication

1. Build → **Authentication** → Get started.
2. Sign-in method tab → enable **Email/Password**.
3. Optional: enable **Google**.
4. Users tab → add a test user, or run the seed script below.

## 3. Create the Firestore database

1. Build → **Firestore Database** → Create database.
2. Pick **production** mode (we'll deploy our own rules).
3. Pick a region close to your users (e.g. `asia-south1` for South Asia).

## 4. Deploy rules and indexes

From the project root:

```bash
npm install -g firebase-tools          # one-time
firebase login
firebase use --add                      # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

The rules in `firestore.rules` enforce per-owner isolation on every
collection and an admin role check for elevated operations. The indexes
in `firestore.indexes.json` cover the composite queries used by the
server (e.g. `gps_logs` by `petId + timestamp`).

## 5. Register the web app

1. Project settings (⚙️) → **General** → Your apps → **Web** (`</>`).
2. Register the app — copy the snippet's config object.
3. Fill `client/.env` (copy from `client/.env.example`):

   ```
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=findpaw-fyp.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=findpaw-fyp
   VITE_FIREBASE_STORAGE_BUCKET=findpaw-fyp.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=1:...:web:...
   ```

## 6. Server service account

The server uses the Admin SDK to read/write under privileged rules:

1. Project settings → **Service accounts**.
2. Click **Generate new private key** → confirm. A JSON downloads.
3. Open it and copy the three fields into `server/.env`:

   ```
   FIREBASE_PROJECT_ID=findpaw-fyp
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@findpaw-fyp.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```

   Newlines in the private key must be escaped as `\n`. Keep this file
   out of version control — it has the same authority as a database
   admin password.

## 7. Seed the database

```bash
cd server
npm install
npm run seed
```

The seeder prints a login (`demo@findpaw.io` / `FindPaw2026!`),
creates three pets, three devices, ~200 GPS logs around Lahore,
a sample geofence, and four alerts. The device API keys are printed
**only once** — save them if you plan to test the upload endpoint.

## 8. Verify

Run both services:

```bash
# Terminal A
cd server && npm run dev

# Terminal B
cd client && npm run dev
```

Open `http://localhost:5173`, sign in with the demo credentials, and
the dashboard should populate from Firestore instead of the in-memory
fallback. The server's `/health` endpoint should return
`"firebase": true`.

## 9. Switching back to demo mode

Comment out or remove the three `FIREBASE_*` env vars in `server/.env`
and the `VITE_FIREBASE_*` ones in `client/.env`. Both layers fall back
to in-memory data; nothing else needs to change.
