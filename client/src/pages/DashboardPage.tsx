import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PawPrint, Radio, BellRing, Brain, Activity, MapPin, Battery, Zap, Loader2 } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TrackingMap from '@/components/map/TrackingMap';
import { petApi, deviceApi, alertApi, gpsApi } from '@/services/api';
import { useGpsStream } from '@/services/socket';
import { predictTrajectory } from '@/services/aiPredictor';
import { formatDistance, timeAgo } from '@/lib/utils';
import type { Pet, Device, Alert, GpsLog } from '@shared/types';

// Turns raw speed/risk numbers into a human-readable behavior label.
function describeBehavior(avgSpeed: number, riskLevel: string): string {
  if (riskLevel === 'high') return 'Erratic Movement';
  if (avgSpeed < 0.3) return 'Stationary';
  if (avgSpeed < 1.5) return 'Walking Normally';
  if (avgSpeed < 3) return 'Active / Playing';
  return 'Running';
}

// Naive "nearest known zone" guess — swap for real geofence lookup once
// the Geofencing page's zones are wired into shared state / the API.
function describeDestination(
  next: { lat: number; lng: number },
  home: { lat: number; lng: number }
): string {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(next.lat - home.lat);
  const dLng = toRad(next.lng - home.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(home.lat)) * Math.cos(toRad(next.lat)) * Math.sin(dLng / 2) ** 2;
  const dist = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist < 150 ? 'Home' : 'Unknown area';
}

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<GpsLog[]>([]);
  const [loading, setLoading] = useState(true);

  const primaryPet = pets[0];
  const primaryDevice = devices.find((d) => d.petId === primaryPet?.id);

  useEffect(() => {
    (async () => {
      try {
        const [petList, deviceList, alertList] = await Promise.all([
          petApi.list(),
          deviceApi.list(),
          alertApi.list({ limit: 5 }),
        ]);
        setPets(petList);
        setDevices(deviceList);
        setAlerts(alertList);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!primaryPet) return;
    (async () => {
      try {
        setHistory(await gpsApi.history(primaryPet.id, { limit: 200 }));
      } catch {
        setHistory([]);
      }
    })();
  }, [primaryPet?.id]);

  useGpsStream(primaryPet?.id, (log) => {
    setHistory((h) => [...h, log].slice(-500));
  });

  const prediction = useMemo(() => {
    if (history.length < 2) return null;
    return predictTrajectory({
      points: history.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp, speed: p.speed })),
      horizonMinutes: 10,
      stepSeconds: 60,
    });
  }, [history]);

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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  if (!primaryPet) {
    return (
      <Card variant="holo" className="p-10 text-center">
        <PawPrint className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <div className="text-white/60 mb-4">Add a pet to get started.</div>
        <Link to="/pets"><Button variant="primary">Add a pet</Button></Link>
      </Card>
    );
  }

  const last = history[history.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-display font-bold neon-text"
        >
          Mission Control
        </motion.h1>
        <p className="text-white/60 mt-1">Real-time intelligence on your tracked animals.</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<PawPrint className="w-5 h-5" />} label="Tracked Pets" value={pets.length} delta={`${pets.length} total`} accent="cyan" />
        <StatCard icon={<Radio className="w-5 h-5" />} label="GPS Tags Online" value={devices.filter((d) => d.status === 'online').length} delta={`${devices.length} registered`} accent="green" />
        <StatCard icon={<BellRing className="w-5 h-5" />} label="Active Alerts" value={alerts.filter((a) => !a.read).length} delta="unread" accent="amber" />
        <StatCard icon={<Brain className="w-5 h-5" />} label="AI Prediction Accuracy" value={prediction ? `${Math.round(prediction.confidence * 100)}%` : '—'} delta="Model: hybrid" accent="purple" />
      </div>

      {/* Live tracking preview + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="holo" className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-neon-green" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-neon-green animate-ping" />
              </div>
              <div>
                <div className="font-display text-sm">Live Tracking — {primaryPet.name}</div>
                <div className="text-xs text-white/50">AI projecting next 10 minutes</div>
              </div>
            </div>
            <Link
              to={`/tracking/${primaryPet.id}`}
              className="text-xs text-neon-cyan hover:text-white transition-colors"
            >
              Open full view →
            </Link>
          </div>
          <div className="h-[420px]">
            {last ? (
              <TrackingMap
                history={history}
                prediction={prediction}
                center={[last.lat, last.lng]}
                followLive
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-white/50 px-6 text-center">
                No location data yet for {primaryPet.name}. <Link to="/tracker-setup" className="text-neon-cyan ml-1">Set up a tracker →</Link>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-neon-purple" />
              <div className="font-display text-sm">AI Behavior Analysis</div>
            </div>
            {prediction ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Risk</span>
                  <span className={`badge ${
                    prediction.riskLevel === 'safe' ? 'badge-green' :
                    prediction.riskLevel === 'low' ? 'badge-cyan' :
                    prediction.riskLevel === 'moderate' ? 'badge-amber' : 'badge-pink'
                  }`}>
                    {prediction.riskLevel.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Behavior</span>
                  <span className="text-white font-mono">{describeBehavior(prediction.avgSpeed, prediction.riskLevel)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Confidence</span>
                  <span className="text-white font-mono">{Math.round(prediction.confidence * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Predicted Destination</span>
                  <span className="text-white font-mono">{describeDestination(prediction.nextPosition, history[0])}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Next Prediction</span>
                  <span className="text-white font-mono">{Math.round((prediction.nextPosition.tOffsetSec ?? 60) / 60) || 1} min</span>
                </div>
                {prediction.anomalies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-amber-300 mb-2">⚠ Anomalies detected</div>
                    <ul className="space-y-1 text-xs text-white/70">
                      {prediction.anomalies.map((a, i) => (
                        <li key={i}>• {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-white/40">Need at least 2 GPS points to run AI analysis.</div>
            )}
          </Card>

          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-neon-cyan" />
              <div className="font-display text-sm">Today's Activity</div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-white/40" />
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Distance</div>
                  <div className="font-mono">{formatDistance(totalDistance)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Battery className="w-4 h-4 text-white/40" />
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Device battery</div>
                  <div className="font-mono">{primaryDevice ? `${primaryDevice.battery}%` : '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-white/40" />
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Last sync</div>
                  <div className="font-mono">{primaryDevice ? timeAgo(primaryDevice.lastSync) : '—'}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent alerts */}
      <Card variant="holo" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            <div className="font-display text-sm">Recent Alerts</div>
          </div>
          <Link to="/alerts" className="text-xs text-neon-cyan hover:text-white">View all →</Link>
        </div>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-sm text-white/50 text-center py-6">No alerts yet.</div>
          ) : (
            alerts.slice(0, 5).map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.severity === 'critical' ? 'bg-neon-pink' :
                    alert.severity === 'high' ? 'bg-amber-400' :
                    alert.severity === 'medium' ? 'bg-neon-cyan' : 'bg-white/40'
                  }`} />
                  <div>
                    <div className="text-sm">{alert.title}</div>
                    <div className="text-xs text-white/50">{alert.message}</div>
                  </div>
                </div>
                <div className="text-xs text-white/40 font-mono">{timeAgo(alert.createdAt)}</div>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}