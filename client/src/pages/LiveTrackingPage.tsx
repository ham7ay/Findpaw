import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, RefreshCw, AlertTriangle, TrendingUp, MapPin, Activity, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TrackingMap from '@/components/map/TrackingMap';
import { DEMO_PETS, generateGpsHistory } from '@/services/demoData';
import { predictTrajectory, type PredictionResult } from '@/services/aiPredictor';
import { formatDistance, formatSpeed } from '@/lib/utils';
import type { GpsLog } from '@shared/types';

export default function LiveTrackingPage() {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();

  const initialPet = petId ? DEMO_PETS.find((p) => p.id === petId) : DEMO_PETS[0];
  const [selectedPet, setSelectedPet] = useState(initialPet ?? DEMO_PETS[0]);
  const [horizon, setHorizon] = useState(10);
  const [stepSeconds, setStepSeconds] = useState(60);
  const [showHistory, setShowHistory] = useState(true);
  const [showPrediction, setShowPrediction] = useState(true);
  const [showConfidenceCone, setShowConfidenceCone] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [petMenuOpen, setPetMenuOpen] = useState(false);

  useEffect(() => {
    if (petId && initialPet) setSelectedPet(initialPet);
  }, [petId, initialPet]);

  const history = useMemo<GpsLog[]>(
    () => generateGpsHistory(selectedPet.id, `device-${selectedPet.id}`, 90 + refreshTick * 2),
    [selectedPet.id, refreshTick]
  );

  const prediction = useMemo<PredictionResult>(
    () =>
      predictTrajectory({
        points: history.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp, speed: p.speed })),
        horizonMinutes: horizon,
        stepSeconds,
      }),
    [history, horizon, stepSeconds]
  );

  const last = history[history.length - 1];

  const totalDistance = useMemo(() => {
    return history.reduce((acc, p, i) => {
      if (i === 0) return acc;
      const prev = history[i - 1];
      const R = 6371000;
      const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
      const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((prev.lat * Math.PI) / 180) * Math.cos((p.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return acc + 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }, 0);
  }, [history]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-bold neon-text">Live Tracking</h1>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-neon-green/10 border border-neon-green/30">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-neon-green">Streaming</span>
            </div>
          </div>
          <p className="text-white/50 text-sm">Real-time GPS feed enhanced with AI trajectory forecasting.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Pet selector */}
          <div className="relative">
            <button
              onClick={() => setPetMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-neon-cyan/50 transition-colors text-sm"
            >
              <span className="text-lg">{selectedPet.species === 'dog' ? '🐕' : selectedPet.species === 'cat' ? '🐈' : '🐾'}</span>
              <span>{selectedPet.name}</span>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>
            {petMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-56 rounded-lg bg-navy-900 border border-white/10 shadow-glow z-50 overflow-hidden"
              >
                {DEMO_PETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPet(p);
                      setPetMenuOpen(false);
                      navigate(`/tracking/${p.id}`);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                      p.id === selectedPet.id ? 'bg-white/[0.03] text-neon-cyan' : ''
                    }`}
                  >
                    <span className="text-lg">{p.species === 'dog' ? '🐕' : p.species === 'cat' ? '🐈' : '🐾'}</span>
                    <div className="text-left">
                      <div>{p.name}</div>
                      <div className="text-xs text-white/40">{p.breed}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <Card variant="holo" className="lg:col-span-3 p-0 overflow-hidden">
          <div className="h-[600px] relative">
            <TrackingMap
              history={showHistory ? history : []}
              prediction={showPrediction ? prediction : null}
              center={[last.lat, last.lng]}
              followLive
              showConfidenceCone={showConfidenceCone}
            />
            {/* Legend overlay */}
            <div className="absolute bottom-4 left-4 z-[400] glass rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-neon-cyan" />
                <span className="text-white/70">Historical path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t-2 border-dashed border-neon-purple" />
                <span className="text-white/70">AI prediction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neon-purple/20 border border-neon-purple/50" />
                <span className="text-white/70">Confidence cone</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Side panel: AI controls + metrics */}
        <div className="space-y-4">
          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-neon-purple" />
              <div className="font-display text-sm">AI Forecast</div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/60">Horizon</span>
                  <span className="font-mono text-neon-cyan">{horizon} min</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/60">Step interval</span>
                  <span className="font-mono text-neon-cyan">{stepSeconds}s</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={15}
                  value={stepSeconds}
                  onChange={(e) => setStepSeconds(Number(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/60">Show history</span>
                  <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} className="accent-neon-cyan" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/60">Show prediction</span>
                  <input type="checkbox" checked={showPrediction} onChange={(e) => setShowPrediction(e.target.checked)} className="accent-neon-cyan" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/60">Confidence cone</span>
                  <input type="checkbox" checked={showConfidenceCone} onChange={(e) => setShowConfidenceCone(e.target.checked)} className="accent-neon-cyan" />
                </label>
              </div>
            </div>
          </Card>

          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-neon-cyan" />
              <div className="font-display text-sm">Live Metrics</div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="pb-3 mb-1 border-b border-white/10 space-y-1.5">
                <div className="text-xs text-white/50 mb-2">Current Position</div>
                <Metric label="Latitude" value={last.lat.toFixed(5)} />
                <Metric label="Longitude" value={last.lng.toFixed(5)} />
              </div>
              <Metric label="Risk" value={prediction.riskLevel.toUpperCase()} accent={
                prediction.riskLevel === 'safe' ? 'green' :
                prediction.riskLevel === 'low' ? 'cyan' :
                prediction.riskLevel === 'moderate' ? 'amber' : 'pink'
              } />
              <Metric label="Confidence" value={`${Math.round(prediction.confidence * 100)}%`} />
              <Metric label="Risk score" value={`${prediction.riskScore}/100`} />
              <Metric label="Avg. speed" value={formatSpeed(prediction.avgSpeed)} />
              <Metric label="Bearing" value={`${Math.round(prediction.bearing)}°`} />
              <Metric label="Distance today" value={formatDistance(totalDistance)} />
              <Metric label="History points" value={history.length} />
              <Metric label="Forecast points" value={prediction.points.length} />
            </div>
          </Card>

          {prediction.anomalies.length > 0 && (
            <Card variant="holo" className="p-5 border-amber-400/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div className="font-display text-sm text-amber-200">Anomalies</div>
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                {prediction.anomalies.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-400">▸</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Timeline strip */}
      <Card variant="holo" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-neon-cyan" />
          <div className="font-display text-sm">Predicted trajectory timeline</div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {prediction.points.map((p, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-neon-purple/40 transition-colors"
              >
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">t+{p.tOffsetSec}s</div>
                <div className="font-mono text-xs text-white/80">{p.lat.toFixed(5)}</div>
                <div className="font-mono text-xs text-white/80">{p.lng.toFixed(5)}</div>
                <div className="mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-neon-purple" />
                  <span className="text-[10px] text-neon-purple/80">{Math.round(p.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: 'cyan' | 'purple' | 'green' | 'amber' | 'pink' }) {
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