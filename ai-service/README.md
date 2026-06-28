# Find🐾 AI Service

A FastAPI microservice that powers trajectory prediction for the Find🐾 platform.

## What it does

Given a window of recent GPS logs for one animal, the service predicts the
next N positions, computes a confidence score for each, and returns an
overall risk classification (`safe` → `high`).

Two model paths are supported:

1. **Hybrid (default)** — pure NumPy. Ordinary least-squares regression on
   the local-tangent-plane projection of recent positions, blended with
   bearing/speed-based dead reckoning. Always available, runs in <10 ms.
2. **LSTM (optional)** — if a Keras model exists at `MODEL_PATH`, the
   service uses it for the forward pass and re-uses the hybrid path
   for anomaly detection and risk scoring.

Whichever path runs, the response schema is identical, so the Node.js
gateway and the React client treat both the same.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
docker build -t findpaw-ai .
docker run -p 8000:8000 findpaw-ai
```

## Endpoints

| Method | Path       | Purpose                                  |
| ------ | ---------- | ---------------------------------------- |
| GET    | `/`        | Service identity + model status          |
| GET    | `/health`  | Liveness probe                           |
| POST   | `/predict` | Run prediction on a GPS window           |

### Request body for `/predict`

```json
{
  "logs": [
    { "lat": 31.5204, "lng": 74.3587, "timestamp": 1750000000000, "speed": 1.2, "bearing": 45 }
  ],
  "horizonSteps": 8,
  "stepSeconds": 60
}
```

### Response

```json
{
  "points": [
    { "lat": 31.5205, "lng": 74.3589, "timestamp": ..., "confidence": 0.87, "tOffsetSec": 60 }
  ],
  "nextPosition": { ... },
  "bearing": 47.3,
  "avgSpeed": 1.21,
  "confidence": 0.83,
  "riskLevel": "safe",
  "riskScore": 4,
  "anomalies": [],
  "model": "hybrid"
}
```

## Model details

### Hybrid (default)

1. **Local projection** — convert all GPS points to meters in the local
   tangent plane around the most recent position.
2. **Linear regression** — fit OLS to `x(t)` and `y(t)`.
3. **Velocity smoothing** — exponentially-weighted moving average of
   per-segment speed and bearing (α = 0.4).
4. **Blend** — at step `i / horizon = w`, the predicted position is
   `(1 − w) · dead_reckoning + w · regression`. Dead-reckoning dominates
   the near term; regression dominates the far term.
5. **Confidence** — base confidence starts at `0.92 − varPenalty · 0.5`,
   where `varPenalty` reflects the spread of recent speeds and bearings.
   Each step further decays confidence by 7 %.
6. **Anomaly detection** — flags speed spikes (>2.5× median),
   sharp direction reversals (>120° between consecutive segments),
   and inactivity gaps (>10 min without an update).
7. **Risk score** — sums anomalies, variance penalty, fast movement,
   and stale signal; mapped to `safe / low / moderate / high`.

### LSTM (optional)

Drop a trained Keras model at `./models/lstm_trajectory.keras`. Expected
input shape: `(batch, time_steps, 5)` with features
`[lat, lng, speed, bearing, dt_sec]`. Expected output: `(horizon, 2)`
giving lat/lng deltas relative to the last observed point.

Training script is left as an exercise — feed it segmented GPS sessions
and supervise it against the position N steps later.
