# Find🐾 AI Model

The heart of Find🐾 is the **trajectory prediction engine**: given a window of
recent GPS observations, it forecasts where the animal will be in the next
1–30 minutes, attaches a per-step confidence, classifies the overall risk, and
flags behavioural anomalies.

This document walks through the math step by step, the way you'd present it
in an FYP defence.

## TL;DR

A hybrid predictor that combines:

- **OLS linear regression** on local-tangent-plane coordinates (long-term trend);
- **EWMA-smoothed dead reckoning** from recent bearing/speed (short-term intent);
- A **horizon-weighted blend** of the two, so the prediction respects the
  animal's current heading near term and the long-term drift far term;
- A **variance-aware confidence model** that decays per step;
- A **rule-based anomaly + risk layer** that flags speed spikes, direction
  reversals, and signal loss;
- An **optional LSTM** (Keras) head when a trained model is supplied.

The same logic ships in three places:

- `client/src/services/aiPredictor.ts` — runs in the browser so the demo
  works without backend.
- `server/src/services/aiPredictor.ts` — server-side reference implementation.
- `ai-service/main.py` — FastAPI + NumPy / optional TensorFlow.

The three implementations are kept structurally identical so the result
schema agrees regardless of where the prediction runs.

## 1. Local-tangent-plane projection

GPS coordinates are spherical, so Euclidean math (mean, regression, dot
product) doesn't behave linearly across long distances. For the short windows
we care about (≤ 1 km), we project every point into a flat plane in meters
relative to the most recent observation, the **anchor** A:

$$
x = R\,(\lambda - \lambda_A)\cos(\phi_A),\qquad
y = R\,(\phi - \phi_A)
$$

where R is Earth's radius (6 371 000 m), φ is latitude, λ is longitude, both
in radians. The inverse:

$$
\phi = \phi_A + y/R,\qquad
\lambda = \lambda_A + x/(R\cos\phi_A)
$$

This is the **equirectangular projection**, accurate to centimeters within
~1 km of the anchor — well below GPS device noise.

## 2. Ordinary least squares on x(t) and y(t)

After projection, every log becomes a tuple `(t, x, y)`. We fit two simple
regressions:

$$
x(t) = a_x + b_x t,\qquad y(t) = a_y + b_y t
$$

Closed form (n observations, sums `Σt`, `Σx`, `Σtx`, `Σt²`):

$$
b = \frac{n\,\Sigma tx - \Sigma t\,\Sigma x}{n\,\Sigma t^2 - (\Sigma t)^2},\qquad
a = \frac{\Sigma x - b\,\Sigma t}{n}
$$

This captures the **long-term direction** of travel. It's stable: as long as
we don't extrapolate too far, it produces a smooth straight forecast.

## 3. EWMA dead reckoning

Linear regression is too rigid for animals that change behaviour. So in
parallel we estimate the **current** velocity from the most recent segments:

For each consecutive pair `(P_{i−1}, P_i)`, compute distance via haversine
and the dt between timestamps:

$$
v_i = \frac{\text{haversine}(P_{i-1},P_i)}{t_i - t_{i-1}},\qquad
\theta_i = \text{bearing}(P_{i-1},P_i)
$$

Then we apply an **exponentially weighted moving average** with α = 0.4:

$$
\bar v_k = \alpha v_k + (1-\alpha)\,\bar v_{k-1}
$$

The result is a velocity vector $(\bar v_x, \bar v_y) = (\bar v \sin\bar\theta,\,\bar v \cos\bar\theta)$ that
reflects the **recent past disproportionately more than the distant past**.

Pure dead reckoning would then forecast each future point as `current + v · Δt`.

## 4. Horizon-weighted blend

Dead reckoning is great near the present (it respects the current heading);
linear regression is better far from the present (it converges to the long-term
trend instead of flying off in a single direction). So at step `i` of `horizon`:

$$
w = \min(1, i/\text{horizon})
$$

$$
\widehat{x}_i = (1-w)\,(x_{\text{last}} + \bar v_x\,i\,\Delta t) + w\,(a_x + b_x\,t_i)
$$

This is the trick that makes the prediction visually feel right: it leaves the
animal's current position pointing in the direction it's already going, then
bends gently toward the long-term trajectory.

## 5. Confidence model

We start from a base confidence that punishes high variance:

$$
\text{varPenalty} = \min\!\left(1,\;\frac{\sigma_v/\max(\bar v, 0.5) + \sigma_\theta/180}{2}\right)
$$

$$
c_0 = \max(0.35,\; 0.92 - 0.5\,\text{varPenalty})
$$

Each step further decays by 7 %:

$$
c_i = \max(0.15,\; c_0 \cdot 0.93^{\,i-1})
$$

So a steady walk yields confidences in the 0.85–0.6 range; an erratic burst
collapses to ~0.4 quickly.

## 6. Anomaly detection

Three rule-based detectors that earn their place because they're cheap and
have very high precision in this domain:

| Rule                  | Trigger                                          |
| --------------------- | ------------------------------------------------ |
| **Speed spike**       | Most recent speed > 2.5 × median of recent       |
| **Direction reversal**| Δ heading between last two segments > 120°       |
| **Signal loss**       | `now − lastTimestamp > 10 min`                   |

Each fires only on the relevant condition; signals don't accumulate noise.

## 7. Risk scoring

A weighted sum, clipped to [0, 100]:

```
risk = 18 · (# anomalies)
     + 25 · varPenalty
     + 12 · (avgSpeed > 5 m/s)
     + 15 · (signal gap > 5 min)
```

Mapped to a level:

| Score   | Level     |
| ------- | --------- |
| ≥ 70    | high      |
| 40–69   | moderate  |
| 15–39   | low       |
| < 15    | safe      |

## 8. Optional LSTM head

If `MODEL_PATH` points to a saved Keras model in the AI service, the
service uses it for the position forecast and re-uses the hybrid path for
anomaly detection and risk scoring (so the schema doesn't drift).

Expected I/O:

| Tensor      | Shape                       | Meaning                                  |
| ----------- | --------------------------- | ---------------------------------------- |
| input       | `(batch, T, 5)`             | `[lat, lng, speed, bearing, dt_sec]`     |
| output      | `(batch, horizon, 2)`       | lat/lng deltas relative to the last obs  |

A typical training recipe: split logs into 16-step windows, label each
window with the position 8 steps later, normalize, train a 2-layer LSTM
with MSE loss, and save with `model.save("models/lstm_trajectory.keras")`.

## 9. Limitations & honest caveats

- The equirectangular projection breaks down beyond ~5 km from the anchor.
  Predictions for a galloping animal at horizons > 30 min should not be
  trusted; the system caps the UI controls accordingly.
- We assume regularly-sampled GPS. Devices that drop out for hours and then
  burst-upload will produce regressions that fit noise. The `historyLimit`
  parameter exists to bound this.
- Risk levels are heuristic, not learned. They've been hand-tuned for dogs
  and cats in urban environments; cattle on open range would warrant different
  thresholds.
- The LSTM head, when supplied, is responsible only for *position*. Operator
  safety decisions still come from the rule-based risk layer — by design.

## 10. Why this design for an FYP

It demonstrates:

- A real signal-processing pipeline (projection → fitting → smoothing → blending).
- A clean separation between learnable and rule-based components.
- A working baseline that runs offline so the demo never breaks during a viva.
- A clear path to a deep-learning extension (the LSTM head).
- Reasonable code economy: ~250 lines of math, end-to-end, in three languages.
