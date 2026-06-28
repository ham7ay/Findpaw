# 🐾 Find🐾 — AI-Powered Smart Animal Tracking & Monitoring System

> **"AI-powered animal tracking for smarter protection."**

A production-ready, futuristic web platform for tracking pets and wild animals using IoT GPS tags. Features a real AI trajectory prediction engine, live tracking, geofencing, alerts, analytics, and a beautiful cyberpunk-inspired dark UI.

![tech](https://img.shields.io/badge/React-19-61dafb) ![tech](https://img.shields.io/badge/TypeScript-5-3178c6) ![tech](https://img.shields.io/badge/Firebase-11-ffca28) ![tech](https://img.shields.io/badge/Node.js-20-339933) ![tech](https://img.shields.io/badge/AI-Trajectory_Prediction-8b5cf6)

---

## 📁 Project Structure

```
findpaw/
├── client/              # React + Vite + TypeScript frontend
├── server/              # Node.js + Express + Firebase Admin backend
├── ai-service/          # Python AI microservice (FastAPI + LSTM)
├── shared/              # Shared TypeScript types
├── docs/                # Documentation (API, AI model, deployment)
├── firebase.json        # Firebase Hosting config
├── firestore.rules      # Firestore security rules
└── firestore.indexes.json
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.10+ (for the AI service; optional — JS fallback exists)
- A **Firebase project** (free Spark plan works)

### 2. Clone & Install

```bash
# From repo root
cd client && npm install
cd ../server && npm install
cd ../ai-service && pip install -r requirements.txt   # optional
```

### 3. Configure Firebase

1. Go to <https://console.firebase.google.com> → create a project.
2. Enable **Authentication** → Email/Password + Google providers.
3. Enable **Firestore Database** (start in production mode).
4. Project Settings → General → Add a Web App → copy the config.
5. Project Settings → Service Accounts → Generate new private key (for backend).

### 4. Environment Variables

**`client/.env`** (copy from `client/.env.example`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_MAPBOX_TOKEN=optional_for_mapbox
```

**`server/.env`** (copy from `server/.env.example`):
```
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=replace-with-strong-secret
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
```

### 5. Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

### 6. Run the Stack

Open 3 terminals:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev

# Terminal 3 — AI Service (optional, JS fallback is built-in)
cd ai-service && uvicorn main:app --reload --port 8000
```

Visit **<http://localhost:5173>**.

### 7. Seed Sample Data (optional)

```bash
cd server && npm run seed
```

This creates a demo user, 2 pets, 2 devices, and 200 GPS log points so the AI prediction engine has data to work with immediately.

---

## 🧠 The AI Prediction Engine — the Heart of Find🐾

When a GPS tag streams coordinates, the AI engine:

1. **Pulls the last N points** for that device from Firestore.
2. **Computes velocity & bearing** for each segment using the Haversine formula.
3. **Runs Linear Regression** on the bearing/velocity time-series to project a short-term trajectory.
4. **Runs LSTM** (when the Python service is up) for sequence-aware long-term forecasts.
5. **Detects anomalies** — sudden direction reversals, abnormal speed, geofence breaches.
6. **Outputs**: predicted lat/lng for the next N steps, a confidence score, and a risk level.

The frontend renders this as a glowing predicted route on the map with confidence circles.

A pure-JS fallback in `client/src/services/aiPredictor.ts` runs in-browser so the system works even without the Python microservice — perfect for demos and free hosting tiers.

See **[docs/AI_MODEL.md](docs/AI_MODEL.md)** for the full math.

---

## 🗺️ Maps

Uses **Leaflet** with a free dark CartoDB tile layer by default — **no API key required**. If you set `VITE_MAPBOX_TOKEN`, it upgrades to Mapbox tiles automatically.

---

## 🧪 Available Scripts

### Client
| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (HMR) on :5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

### Server
| Command | Description |
|---|---|
| `npm run dev` | tsx watch mode on :5000 |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server |
| `npm run seed` | Seed Firestore with demo data |

---

## 🚢 Deployment

### Frontend → Firebase Hosting
```bash
cd client && npm run build
cd .. && firebase deploy --only hosting
```

### Backend → Render / Railway / Fly.io
1. Push to GitHub.
2. Create a new Web Service, point at the `server/` directory.
3. Build: `npm install && npm run build` — Start: `npm start`.
4. Add the same env vars as `.env`.

### AI Service → Render (Docker) or any Python host
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 📚 Documentation

- **[docs/API.md](docs/API.md)** — Full REST API reference
- **[docs/AI_MODEL.md](docs/AI_MODEL.md)** — Trajectory prediction explained
- **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)** — Firebase walkthrough
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Production deployment

---

## 🔒 Security

- Firestore rules restrict reads/writes to authenticated owners.
- JWT verification on all `/api/*` routes via Firebase Admin.
- Helmet, rate-limiting (`express-rate-limit`), and input sanitization.
- Device endpoints use a separate `device-key` header validated against the `devices` collection.

---

## 📜 License

MIT — built for the **Find🐾** Final Year Project.
