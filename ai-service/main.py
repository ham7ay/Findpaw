"""
Find🐾 — AI trajectory prediction microservice
==============================================
A FastAPI server that exposes a /predict endpoint for forecasting an
animal's near-future GPS positions from a window of recent GPS logs.

It uses a HYBRID model:

  1. Local-tangent-plane projection (lat/lng → meters) so we can use
     Euclidean math safely at small scales.
  2. Ordinary least-squares linear regression on x(t) and y(t) for the
     long-term trend.
  3. Exponentially-weighted moving averages of speed and bearing for
     short-term dead reckoning.
  4. A regression / dead-reckoning blend that favours dead-reckoning
     in the near term and regression at the horizon.
  5. Optional LSTM head (TensorFlow): loaded if a model file is found
     at MODEL_PATH, otherwise the JS-style fallback runs.
  6. Per-step confidence decay based on horizon distance and the
     variance of recent speed / bearing.
  7. Anomaly detection + risk scoring identical to the TS predictor
     so client and server agree.

Run:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000

Environment:
    MODEL_PATH    Optional path to a saved Keras LSTM model.
"""
from __future__ import annotations

import math
import os
import time
from typing import List, Optional, Literal

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─── Optional TensorFlow ─────────────────────────────────────────────
TF_AVAILABLE = False
LSTM_MODEL = None
MODEL_PATH = os.environ.get("MODEL_PATH", "./models/lstm_trajectory.keras")
try:
    import tensorflow as tf  # noqa: F401  (only if installed)
    TF_AVAILABLE = True
    if os.path.exists(MODEL_PATH):
        try:
            LSTM_MODEL = tf.keras.models.load_model(MODEL_PATH)
            print(f"✅ Loaded LSTM model from {MODEL_PATH}")
        except Exception as e:
            print(f"⚠️  Failed to load LSTM model ({e}); using hybrid fallback.")
            LSTM_MODEL = None
    else:
        print(f"ℹ️  No LSTM model at {MODEL_PATH}; using hybrid fallback.")
except ImportError:
    print("ℹ️  TensorFlow not installed; using pure-NumPy hybrid predictor.")


# ─── Pydantic schemas ────────────────────────────────────────────────
class GpsPoint(BaseModel):
    lat: float
    lng: float
    timestamp: int
    speed: Optional[float] = 0.0
    bearing: Optional[float] = 0.0


class PredictionInput(BaseModel):
    logs: List[GpsPoint] = Field(..., min_length=0)
    horizonSteps: int = 8
    stepSeconds: int = 60


class PredictedPoint(BaseModel):
    lat: float
    lng: float
    timestamp: int
    confidence: float
    tOffsetSec: int


class PredictionResult(BaseModel):
    points: List[PredictedPoint]
    nextPosition: PredictedPoint
    bearing: float
    avgSpeed: float
    confidence: float
    riskLevel: Literal["safe", "low", "moderate", "high"]
    riskScore: int
    anomalies: List[str]
    model: Literal["linear", "lstm", "hybrid"]


# ─── Geometry helpers ────────────────────────────────────────────────
R_EARTH = 6_371_000.0


def to_local_xy(p: dict, anchor: dict) -> tuple[float, float]:
    lat_rad = math.radians(anchor["lat"])
    x = R_EARTH * math.radians(p["lng"] - anchor["lng"]) * math.cos(lat_rad)
    y = R_EARTH * math.radians(p["lat"] - anchor["lat"])
    return x, y


def from_local_xy(x: float, y: float, anchor: dict) -> tuple[float, float]:
    lat = anchor["lat"] + math.degrees(y / R_EARTH)
    lng = anchor["lng"] + math.degrees(x / (R_EARTH * math.cos(math.radians(anchor["lat"]))))
    return lat, lng


def haversine(a: dict, b: dict) -> float:
    dlat = math.radians(b["lat"] - a["lat"])
    dlng = math.radians(b["lng"] - a["lng"])
    s = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(a["lat"])) * math.cos(math.radians(b["lat"])) * math.sin(dlng / 2) ** 2)
    return 2 * R_EARTH * math.atan2(math.sqrt(s), math.sqrt(1 - s))


def bearing(a: dict, b: dict) -> float:
    lat1, lat2 = math.radians(a["lat"]), math.radians(b["lat"])
    dlng = math.radians(b["lng"] - a["lng"])
    y = math.sin(dlng) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlng)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def ewma(values: List[float], alpha: float = 0.4) -> float:
    if not values:
        return 0.0
    v = values[0]
    for x in values[1:]:
        v = alpha * x + (1 - alpha) * v
    return v


# ─── Hybrid predictor (NumPy fallback) ───────────────────────────────
def predict_hybrid(inp: PredictionInput) -> PredictionResult:
    logs = sorted([l.model_dump() for l in inp.logs], key=lambda x: x["timestamp"])
    horizon = inp.horizonSteps
    step_sec = inp.stepSeconds
    now = int(time.time() * 1000)

    if not logs:
        empty_point = PredictedPoint(lat=0, lng=0, timestamp=now, confidence=0, tOffsetSec=0)
        return PredictionResult(
            points=[], nextPosition=empty_point, bearing=0, avgSpeed=0,
            confidence=0, riskLevel="safe", riskScore=0,
            anomalies=["No GPS data"], model="linear",
        )

    last = logs[-1]
    anchor = {"lat": last["lat"], "lng": last["lng"]}

    if len(logs) < 3:
        stationary = [
            PredictedPoint(
                lat=anchor["lat"], lng=anchor["lng"],
                timestamp=last["timestamp"] + (i + 1) * step_sec * 1000,
                confidence=0.25, tOffsetSec=(i + 1) * step_sec,
            )
            for i in range(horizon)
        ]
        return PredictionResult(
            points=stationary, nextPosition=stationary[0],
            bearing=last.get("bearing") or 0.0,
            avgSpeed=last.get("speed") or 0.0,
            confidence=0.25, riskLevel="safe", riskScore=5,
            anomalies=["Insufficient history for high-confidence prediction"],
            model="linear",
        )

    # Project to local meters
    t0 = logs[0]["timestamp"]
    ts = np.array([(l["timestamp"] - t0) / 1000.0 for l in logs])
    xy = np.array([to_local_xy(l, anchor) for l in logs])
    xs, ys = xy[:, 0], xy[:, 1]

    # OLS via np.polyfit (degree 1)
    bx, ax = np.polyfit(ts, xs, 1)
    by, ay = np.polyfit(ts, ys, 1)

    # Speeds and bearings of consecutive pairs
    speeds: List[float] = []
    bearings: List[float] = []
    for i in range(1, len(logs)):
        dt = (logs[i]["timestamp"] - logs[i - 1]["timestamp"]) / 1000.0
        if dt <= 0:
            continue
        speeds.append(haversine(logs[i - 1], logs[i]) / dt)
        bearings.append(bearing(logs[i - 1], logs[i]))

    avg_speed = ewma(speeds)
    smooth_bearing = ewma(bearings)
    last_bearing = bearings[-1] if bearings else 0.0

    speed_sd = float(np.std(speeds, ddof=1)) if len(speeds) >= 2 else 0.0
    bearing_sd = float(np.std(bearings, ddof=1)) if len(bearings) >= 2 else 0.0
    var_penalty = min(1.0, (speed_sd / max(avg_speed, 0.5) + bearing_sd / 180.0) / 2.0)
    base_conf = max(0.35, 0.92 - var_penalty * 0.5)

    dr_rad = math.radians(smooth_bearing)
    dr_vx, dr_vy = math.sin(dr_rad) * avg_speed, math.cos(dr_rad) * avg_speed
    base_t = ts[-1]
    cur_x, cur_y = xs[-1], ys[-1]

    predicted: List[PredictedPoint] = []
    for i in range(1, horizon + 1):
        t = base_t + i * step_sec
        x_reg = ax + bx * t
        y_reg = ay + by * t
        x_dr = cur_x + dr_vx * i * step_sec
        y_dr = cur_y + dr_vy * i * step_sec
        w = min(1.0, i / horizon)
        x = x_dr * (1 - w) + x_reg * w
        y = y_dr * (1 - w) + y_reg * w
        lat, lng = from_local_xy(x, y, anchor)
        confidence = max(0.15, base_conf * (0.93 ** (i - 1)))
        predicted.append(PredictedPoint(
            lat=lat, lng=lng,
            timestamp=int(last["timestamp"] + i * step_sec * 1000),
            confidence=confidence,
            tOffsetSec=i * step_sec,
        ))

    # Anomalies
    anomalies: List[str] = []
    if speeds:
        median = sorted(speeds)[len(speeds) // 2]
        recent = speeds[-1]
        if median > 0 and recent > median * 2.5:
            anomalies.append(f"Speed spike ({recent:.1f} m/s vs median {median:.1f} m/s)")
    if len(bearings) >= 2:
        diff = min(abs(bearings[-2] - bearings[-1]), 360 - abs(bearings[-2] - bearings[-1]))
        if diff > 120:
            anomalies.append(f"Direction reversal Δ={diff:.0f}°")
    gap_sec = (now - last["timestamp"]) / 1000.0
    if gap_sec > 600:
        anomalies.append(f"No GPS update for {int(gap_sec // 60)} min")

    risk = len(anomalies) * 18 + var_penalty * 25
    if avg_speed > 5:
        risk += 12
    if gap_sec > 300:
        risk += 15
    risk_score = min(100, int(round(risk)))
    if risk_score >= 70:
        risk_level: Literal["safe", "low", "moderate", "high"] = "high"
    elif risk_score >= 40:
        risk_level = "moderate"
    elif risk_score >= 15:
        risk_level = "low"
    else:
        risk_level = "safe"

    return PredictionResult(
        points=predicted,
        nextPosition=predicted[0],
        bearing=last_bearing,
        avgSpeed=avg_speed,
        confidence=base_conf,
        riskLevel=risk_level,
        riskScore=risk_score,
        anomalies=anomalies,
        model="hybrid",
    )


def predict_lstm(inp: PredictionInput) -> PredictionResult:
    """LSTM forward pass — used only if the trained model is loaded."""
    if LSTM_MODEL is None:
        return predict_hybrid(inp)

    # Build a feature window: [lat, lng, speed, bearing, dt] × N
    logs = sorted([l.model_dump() for l in inp.logs], key=lambda x: x["timestamp"])
    if len(logs) < 8:
        return predict_hybrid(inp)

    window = []
    for i, l in enumerate(logs[-16:]):
        dt = 0.0 if i == 0 else (l["timestamp"] - logs[-16:][i - 1]["timestamp"]) / 1000.0
        window.append([l["lat"], l["lng"], l.get("speed") or 0.0, l.get("bearing") or 0.0, dt])
    x = np.array(window, dtype=np.float32).reshape(1, len(window), 5)

    try:
        raw = LSTM_MODEL.predict(x, verbose=0)[0]  # shape (horizon, 2)  → lat,lng deltas
        last = logs[-1]
        out: List[PredictedPoint] = []
        for i, delta in enumerate(raw[: inp.horizonSteps]):
            lat = last["lat"] + float(delta[0])
            lng = last["lng"] + float(delta[1])
            out.append(PredictedPoint(
                lat=lat, lng=lng,
                timestamp=int(last["timestamp"] + (i + 1) * inp.stepSeconds * 1000),
                confidence=max(0.2, 0.95 - i * 0.05),
                tOffsetSec=(i + 1) * inp.stepSeconds,
            ))
        # Reuse hybrid for anomaly / risk so output schema stays consistent
        fallback = predict_hybrid(inp)
        return PredictionResult(
            points=out,
            nextPosition=out[0],
            bearing=fallback.bearing,
            avgSpeed=fallback.avgSpeed,
            confidence=float(np.mean([p.confidence for p in out])),
            riskLevel=fallback.riskLevel,
            riskScore=fallback.riskScore,
            anomalies=fallback.anomalies,
            model="lstm",
        )
    except Exception as e:
        print(f"⚠️  LSTM inference failed ({e}); using hybrid fallback.")
        return predict_hybrid(inp)


# ─── FastAPI app ─────────────────────────────────────────────────────
app = FastAPI(title="Find🐾 AI Predictor", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "findpaw-ai",
        "version": "1.0.0",
        "tensorflow": TF_AVAILABLE,
        "lstm_loaded": LSTM_MODEL is not None,
        "model_path": MODEL_PATH,
    }


@app.get("/health")
def health():
    return {"status": "ok", "lstm_loaded": LSTM_MODEL is not None}


@app.post("/predict", response_model=PredictionResult)
def predict(body: PredictionInput) -> PredictionResult:
    if LSTM_MODEL is not None:
        return predict_lstm(body)
    return predict_hybrid(body)
