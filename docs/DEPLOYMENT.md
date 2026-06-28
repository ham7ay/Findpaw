# Find🐾 Deployment

Three components ship independently: the React client, the Node.js
server, and the optional Python AI service. Here are the cheapest
paths that still feel production-quality.

## Client → Firebase Hosting

Firebase Hosting is free, fast, and shares the same project as
Auth/Firestore, so the SDK config is identical.

```bash
cd client
npm install
npm run build           # outputs to client/dist
```

From the **project root** (the Firebase config sits there):

```bash
firebase deploy --only hosting
```

`firebase.json` already points hosting at `client/dist`, falls back
to `index.html` for any unmatched route (SPA mode), and caches
hashed assets for one year.

## Server → Render / Railway / Fly.io

The server is a tiny Express app. Any Node host works. Render is
the simplest:

1. Push the repo to GitHub.
2. Create a new **Web Service** on Render, point it at the repo,
   set:
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Add environment variables from `server/.env`. The private key
   must keep its `\n` escapes when pasted in.
4. Deploy. Render handles HTTPS automatically; copy the URL.
5. Update `CORS_ORIGIN` to your Firebase Hosting URL and
   `VITE_API_URL` (client `.env`) to the Render URL, then redeploy
   the client.

### Alternative — Fly.io with Docker

A `Dockerfile` for the server is not included by default (the build
is so small that the language buildpacks on Render / Railway are
faster). Add one with:

```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

`fly launch` will detect it and deploy.

## AI service → Docker / Cloud Run

Build and push the image:

```bash
cd ai-service
docker build -t findpaw-ai .
```

### Google Cloud Run (recommended)

```bash
gcloud auth configure-docker
docker tag findpaw-ai gcr.io/<your-project>/findpaw-ai
docker push gcr.io/<your-project>/findpaw-ai
gcloud run deploy findpaw-ai \
  --image gcr.io/<your-project>/findpaw-ai \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8000
```

Cloud Run scales to zero — pay only when predictions actually run.

### Local Docker

```bash
docker run -d --name findpaw-ai -p 8000:8000 findpaw-ai
```

Either way, set `AI_SERVICE_URL=https://<host>` in the server's `.env`
and redeploy the server. With the URL unset, the server transparently
falls back to its built-in JS predictor — so the AI service is
genuinely optional in production too.

## Putting it together — production env vars

**Client (`client/.env`)**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=https://findpaw-api.onrender.com
VITE_SOCKET_URL=https://findpaw-api.onrender.com
```

**Server (`server/.env`)**
```
PORT=10000                          # Render assigns one
NODE_ENV=production
CORS_ORIGIN=https://findpaw-fyp.web.app
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN..."
AI_SERVICE_URL=https://findpaw-ai-xxx-as.a.run.app
DEVICE_KEY_SALT=<32+ random bytes>
```

## Smoke test after deploy

```bash
curl https://findpaw-api.onrender.com/health
# {"status":"ok","firebase":true,"aiService":true,...}

curl https://findpaw-ai-xxx-as.a.run.app/health
# {"status":"ok","lstm_loaded":false}
```

Then open the hosted client URL, sign in with the seeded demo
credentials, and verify the live tracking page loads predictions
within a few seconds.

## Cost ballpark

For an FYP demo:

| Component       | Free tier covers it? | Realistic monthly cost |
| --------------- | -------------------- | ---------------------- |
| Firebase Hosting | Yes                 | $0                     |
| Firestore        | Yes (50k reads/day) | $0                     |
| Render web service | Yes (free dyno)   | $0 (sleeps after 15min idle) |
| Cloud Run (AI)   | Yes (180k req/mo free) | $0                  |

A juror-grade demo runs at $0/month. Production-grade with no cold
starts runs around $7-$15/month (one Render starter dyno + Cloud Run
warm instance).
