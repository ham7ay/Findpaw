import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Radio, Zap, Activity, Cpu } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TrackingMap from '@/components/map/TrackingMap';
import { predictTrajectory, type PredictionResult } from '@/services/aiPredictor';
import type { GpsLog } from '@shared/types';
import { formatSpeed } from '@/lib/utils';

const START_LAT = 31.5204;
const START_LNG = 74.3587;

export default function DeviceSimulatorPage() {
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<GpsLog[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [tickMs, setTickMs] = useState(1000);
  const [noise, setNoise] = useState(0.00003);
  const [scenario, setScenario] = useState<'walking' | 'running' | 'erratic' | 'stationary'>('walking');
  const intervalRef = useRef<number | null>(null);
  const stateRef = useRef({
    lat: START_LAT,
    lng: START_LNG,
    bearing: Math.PI / 4,
    speed: 1.2,
  });

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  };

  const reset = () => {
    stop();
    setHistory([]);
    setPrediction(null);
    stateRef.current = {
      lat: START_LAT,
      lng: START_LNG,
      bearing: Math.PI / 4,
      speed: 1.2,
    };
  };

  const start = () => {
    if (running) return;
    setRunning(true);
    intervalRef.current = window.setInterval(() => {
      const s = stateRef.current;

      // Apply scenario behavior
      if (scenario === 'walking') {
        s.speed = 0.8 + Math.random() * 0.8;
        s.bearing += (Math.random() - 0.5) * 0.3;
      } else if (scenario === 'running') {
        s.speed = 3 + Math.random() * 2;
        s.bearing += (Math.random() - 0.5) * 0.15;
      } else if (scenario === 'erratic') {
        s.speed = Math.random() * 4 + 0.5;
        s.bearing += (Math.random() - 0.5) * 1.4;
      } else {
        s.speed = Math.random() * 0.2;
        s.bearing += (Math.random() - 0.5) * 0.8;
      }

      const dt = tickMs / 1000;
      const dist = s.speed * dt;
      const metersToDegLat = 1 / 111111;
      const metersToDegLng = 1 / (111111 * Math.cos((s.lat * Math.PI) / 180));
      s.lat += Math.cos(s.bearing) * dist * metersToDegLat + (Math.random() - 0.5) * noise;
      s.lng += Math.sin(s.bearing) * dist * metersToDegLng + (Math.random() - 0.5) * noise;

      const now = Date.now();
      const newPoint: GpsLog = {
        id: `sim-${now}`,
        deviceId: 'simulator-001',
        petId: 'sim-pet',
        lat: s.lat,
        lng: s.lng,
        accuracy: 5 + Math.random() * 8,
        speed: s.speed,
        bearing: ((s.bearing * 180) / Math.PI + 360) % 360,
        altitude: 210 + Math.random() * 10,
        battery: 80,
        timestamp: now,
      };

      setHistory((h) => {
        const next = [...h, newPoint].slice(-150);
        if (next.length >= 8) {
          const pred = predictTrajectory({
            points: next.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp, speed: p.speed })),
            horizonMinutes: 5,
            stepSeconds: 30,
          });
          setPrediction(pred);
        }
        return next;
      });
    }, tickMs);
  };

  useEffect(() => () => stop(), []);

  // Restart interval when params change while running
  useEffect(() => {
    if (running) {
      stop();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickMs]);

  const last = history[history.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold neon-text">GPS Device Simulator</h1>
        <p className="text-white/60 mt-1">Generate synthetic GPS streams and watch the AI predictor in action.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Controls */}
        <div className="space-y-4">
          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-neon-cyan" />
              <div className="font-display text-sm">Controls</div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                {!running ? (
                  <Button variant="primary" className="flex-1" onClick={start}>
                    <Play className="w-4 h-4 mr-1.5" />
                    Start
                  </Button>
                ) : (
                  <Button variant="secondary" className="flex-1" onClick={stop}>
                    <Pause className="w-4 h-4 mr-1.5" />
                    Pause
                  </Button>
                )}
                <Button variant="ghost" size="md" onClick={reset}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Scenario</label>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value as typeof scenario)}
                  className="input-field !py-2 !text-sm"
                >
                  <option value="walking">🚶 Walking</option>
                  <option value="running">🏃 Running</option>
                  <option value="erratic">⚡ Erratic</option>
                  <option value="stationary">🛑 Stationary</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/60">Tick rate</span>
                  <span className="font-mono text-neon-cyan">{tickMs}ms</span>
                </div>
                <input
                  type="range"
                  min={250}
                  max={3000}
                  step={250}
                  value={tickMs}
                  onChange={(e) => setTickMs(Number(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/60">GPS noise</span>
                  <span className="font-mono text-neon-cyan">±{(noise * 111111).toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.0002}
                  step={0.00001}
                  value={noise}
                  onChange={(e) => setNoise(Number(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
              </div>
            </div>
          </Card>

          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-neon-purple" />
              <div className="font-display text-sm">Stream stats</div>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Status" value={running ? '● Live' : '○ Idle'} accent={running ? 'green' : 'white'} />
              <Row label="Points" value={history.length} />
              <Row label="Current speed" value={last ? formatSpeed(last.speed) : '—'} />
              <Row label="Heading" value={last ? `${Math.round(last.bearing)}°` : '—'} />
              <Row label="Battery" value={last ? `${last.battery}%` : '—'} />
            </div>
          </Card>

          {prediction && (
            <Card variant="holo" className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-neon-purple" />
                <div className="font-display text-sm">AI output</div>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Risk" value={prediction.riskLevel.toUpperCase()} accent={
                  prediction.riskLevel === 'safe' ? 'green' :
                  prediction.riskLevel === 'high' ? 'pink' :
                  prediction.riskLevel === 'moderate' ? 'amber' : 'cyan'
                } />
                <Row label="Confidence" value={`${Math.round(prediction.confidence * 100)}%`} />
                <Row label="Forecast points" value={prediction.points.length} />
                {prediction.anomalies.length > 0 && (
                  <div className="pt-2 border-t border-white/10 text-xs text-amber-300">
                    ⚠ {prediction.anomalies.length} anomaly detected
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Map */}
        <Card variant="holo" className="lg:col-span-3 p-0 overflow-hidden">
          <div className="h-[600px]">
            <TrackingMap
              history={history}
              prediction={prediction}
              center={last ? [last.lat, last.lng] : [START_LAT, START_LNG]}
              followLive={running}
            />
          </div>
        </Card>
      </div>

      {/* Raw output log */}
      <Card variant="holo" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-neon-cyan" />
          <div className="font-display text-sm">Raw GPS stream</div>
          <span className="text-xs text-white/40 font-mono">tail -n 10</span>
        </div>
        <div className="bg-black/30 rounded-lg p-3 font-mono text-[11px] overflow-x-auto max-h-48 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-white/30">Waiting for stream...</div>
          ) : (
            history.slice(-10).reverse().map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/70 whitespace-nowrap"
              >
                <span className="text-white/30">[{new Date(p.timestamp).toISOString().slice(11, 19)}]</span>{' '}
                <span className="text-neon-cyan">{p.lat.toFixed(6)}</span>{' '}
                <span className="text-neon-purple">{p.lng.toFixed(6)}</span>{' '}
                <span className="text-white/50">±{p.accuracy.toFixed(1)}m</span>{' '}
                <span className="text-neon-green">{p.speed.toFixed(2)}m/s</span>{' '}
                <span className="text-amber-400">{Math.round(p.bearing)}°</span>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string | number; accent?: 'cyan' | 'purple' | 'green' | 'amber' | 'pink' | 'white' }) {
  const accentClass =
    accent === 'green' ? 'text-neon-green' :
    accent === 'cyan' ? 'text-neon-cyan' :
    accent === 'amber' ? 'text-amber-400' :
    accent === 'pink' ? 'text-neon-pink' :
    accent === 'purple' ? 'text-neon-purple' :
    'text-white';
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className={`font-mono ${accentClass}`}>{value}</span>
    </div>
  );
}
