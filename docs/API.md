# Find🐾 REST API Reference

Base URL: `http://localhost:5000/api` (dev) or your deployed server URL.

## Authentication

Two auth mechanisms:

| Use case          | Header                              | Where to get it                                  |
| ----------------- | ----------------------------------- | ------------------------------------------------ |
| User endpoints    | `Authorization: Bearer <ID_TOKEN>`  | Firebase Auth client SDK (`user.getIdToken()`)   |
| Device endpoints  | `X-Device-Id` + `X-Device-Key`      | Returned once when the device is registered      |

In **demo mode** (no Firebase env), all user endpoints accept any request
and return data for the synthetic user `demo-user`.

All responses follow:

```json
{ "success": true, "data": ... }
{ "success": false, "error": "<message>" }
```

## Routes

### Auth — `/api/auth`

| Method | Path     | Purpose                                       |
| ------ | -------- | --------------------------------------------- |
| GET    | `/me`    | Get authenticated user profile (creates on first call) |
| POST   | `/role`  | Admin-only: set a user's role (`admin` \| `user`) |

### Pets — `/api/pets`

CRUD over the authenticated user's pets. Owner is enforced on every read & write.

| Method | Path     | Body                                                        |
| ------ | -------- | ----------------------------------------------------------- |
| GET    | `/`      | —                                                           |
| POST   | `/`      | `{ name, species, breed?, age?, weight?, color?, imageUrl? }` |
| GET    | `/:id`   | —                                                           |
| PUT    | `/:id`   | Partial pet                                                 |
| DELETE | `/:id`   | —                                                           |

### Devices — `/api/devices`

| Method | Path                  | Notes                                                    |
| ------ | --------------------- | -------------------------------------------------------- |
| GET    | `/`                   | List devices owned by the user (hash stripped).          |
| POST   | `/`                   | Register a device. **Response includes a raw `apiKey` — store it now; only the hash is persisted.** |
| POST   | `/:id/rotate-key`     | Issue a new key, invalidating the old one.               |
| DELETE | `/:id`                | Permanent.                                               |

### GPS — `/api/gps`

| Method | Path             | Auth     | Notes                                              |
| ------ | ---------------- | -------- | -------------------------------------------------- |
| POST   | `/upload`        | Device   | Single GPS fix. Triggers geofence check + Socket.IO emit. |
| POST   | `/batch`         | Device   | Bulk upload (≤100 logs/request).                   |
| GET    | `/:petId`        | User     | History for one pet. `?limit=200&since=<ms>`.      |

Upload body:

```json
{
  "lat": 31.5204,
  "lng": 74.3587,
  "speed": 1.4,
  "bearing": 47,
  "accuracy": 5,
  "battery": 86
}
```

### Predictions — `/api/predictions`

| Method | Path                 | Purpose                                                |
| ------ | -------------------- | ------------------------------------------------------ |
| POST   | `/:petId/run`        | Pull history, run the AI, persist + return the result. |
| GET    | `/:petId/latest`     | Latest persisted prediction.                           |

Query params for `/run`: `horizonSteps` (1-60, default 8), `stepSeconds` (10-300, default 60), `historyLimit` (3-500, default 120).

### Alerts — `/api/alerts`

| Method | Path           | Notes                                |
| ------ | -------------- | ------------------------------------ |
| GET    | `/`            | `?unread=true&limit=50`              |
| POST   | `/:id/read`    | Mark single alert read.              |
| POST   | `/read-all`    | Mark every alert read.               |
| DELETE | `/:id`         | Delete alert.                        |

### Analytics — `/api/analytics`

| Method | Path                    | Notes                                          |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/:petId?days=7`        | Returns daily distance/active-min, hourly activity, top speed. Falls back to deterministic demo data when Firestore is empty. |

### Geofences — `/api/geofences`

CRUD over geofences. `center` is `{ lat, lng }`, `radius` is meters.
Optional `?petId=<id>` query filter on the GET.

### Admin — `/api/admin`

All routes require `role: 'admin'`.

| Method | Path                | Purpose                                  |
| ------ | ------------------- | ---------------------------------------- |
| GET    | `/users`            | List all users (up to 200).              |
| GET    | `/devices`          | List all devices (hash stripped).        |
| GET    | `/stats`            | Counts per collection.                   |
| DELETE | `/users/:uid`       | Delete a user from Auth + Firestore.     |

## Realtime — Socket.IO

Path: `/socket.io`

| Direction | Event                | Payload                                |
| --------- | -------------------- | -------------------------------------- |
| → server  | `subscribe`          | `{ petId: string }`                    |
| → server  | `unsubscribe`        | `{ petId: string }`                    |
| ← server  | `gps:update`         | A full `GpsLog` for the subscribed pet |
| ← server  | `prediction:update`  | `{ points, riskLevel, confidence }`    |
| ← server  | `alert:new`          | A full `Alert` document                |

A subscribed client receives only the events for pets it has subscribed to —
multiple subscriptions per socket are allowed.

## Health

`GET /health` returns:

```json
{
  "status": "ok",
  "firebase": true,
  "aiService": true,
  "uptime": 122.3,
  "timestamp": "2026-05-22T12:00:00.000Z"
}
```

## Rate limiting

Every `/api/*` route is limited to 120 requests / minute / IP by default
(configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`).
