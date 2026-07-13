import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Activity, Clock, Compass, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { petApi, gpsApi, geofenceApi } from '@/services/api';
import { haversine } from '@/lib/utils';
import type { Pet, GpsLog, Geofence } from '@shared/types';

const COLORS = {
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  green: '#10b981',
  amber: '#f59e0b',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const [history, setHistory] = useState<GpsLog[]>([]);
  const [zones, setZones] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await petApi.list();
        setPets(list);
        if (list.length) setSelectedPetId(list[0].id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedPetId) return;
    setLoading(true);
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    (async () => {
      try {
        const [logs, zoneList] = await Promise.all([
          gpsApi.history(selectedPetId, { since, limit: 1000 }),
          geofenceApi.list(selectedPetId),
        ]);
        setHistory([...logs].sort((a, b) => a.timestamp - b.timestamp));
        setZones(zoneList);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedPetId, timeRange]);

  const data = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    // Bucket points by calendar day
    const dayBuckets = new Map<string, GpsLog[]>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (days - 1 - i));
      dayBuckets.set(d.toDateString(), []);
    }
    history.forEach((p) => {
      const key = new Date(p.timestamp).toDateString();
      if (dayBuckets.has(key)) dayBuckets.get(key)!.push(p);
    });

    const daily = Array.from(dayBuckets.entries()).map(([dateKey, points]) => {
      const d = new Date(dateKey);
      let distance = 0;
      for (let i = 1; i < points.length; i++) {
        distance += haversine(points[i - 1], points[i]);
      }
      const speeds = points.map((p) => p.speed * 3.6); // m/s -> km/h
      return {
        date: days <= 7 ? DAY_LABELS[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
        distance: Math.round((distance / 1000) * 10) / 10, // km
        avgSpeed: speeds.length ? Math.round((speeds.reduce((s, v) => s + v, 0) / speeds.length) * 10) / 10 : 0,
        topSpeed: speeds.length ? Math.round(Math.max(...speeds) * 10) / 10 : 0,
        points: points.length,
      };
    });

    // Active minutes: sum of time gaps where the pet was moving (speed > 0.3 m/s),
    // capping each gap at 10 min so a tracker being off for hours doesn't inflate this.
    let totalActiveMs = 0;
    for (let i = 1; i < history.length; i++) {
      const gapMs = history[i].timestamp - history[i - 1].timestamp;
      const moving = history[i].speed > 0.3 || history[i - 1].speed > 0.3;
      if (moving) totalActiveMs += Math.min(gapMs, 10 * 60 * 1000);
    }
    const totalActive = Math.round(totalActiveMs / 60000); // minutes

    // Hourly activity pattern — ping count per hour-of-day, normalized 0–100
    const hourCounts = new Array(24).fill(0);
    history.forEach((p) => hourCounts[new Date(p.timestamp).getHours()]++);
    const maxHourCount = Math.max(1, ...hourCounts);
    const hourly = hourCounts.map((c, h) => ({
      hour: `${h.toString().padStart(2, '0')}:00`,
      activity: Math.round((c / maxHourCount) * 100),
    }));

    // Zone visits — classify each point against real geofences, else "Unknown"
    const zoneCounts = new Map<string, number>();
    zones.forEach((z) => zoneCounts.set(z.name, 0));
    let unknownCount = 0;
    history.forEach((p) => {
      const match = zones.find((z) => z.center && z.radius !== undefined && haversine(p, z.center) <= z.radius);
      if (match) zoneCounts.set(match.name, (zoneCounts.get(match.name) ?? 0) + 1);
      else unknownCount++;
    });
    const zoneStats = Array.from(zoneCounts.entries()).map(([zone, visits]) => ({ zone, visits }));
    if (unknownCount > 0 || zoneStats.length === 0) zoneStats.push({ zone: 'Unknown', visits: unknownCount });

    const totalDistance = daily.reduce((s, d) => s + d.distance, 0);
    const speedsAll = history.map((p) => p.speed * 3.6).filter((s) => s > 0);
    const avgSpeed = speedsAll.length ? speedsAll.reduce((s, v) => s + v, 0) / speedsAll.length : 0;
    const peakSpeed = speedsAll.length ? Math.max(...speedsAll) : 0;

    return { daily, hourly, zones: zoneStats, totalDistance, totalActive, avgSpeed, peakSpeed };
  }, [history, zones, timeRange]);

  const tooltipStyle = {
    backgroundColor: 'rgba(8, 13, 28, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.5rem',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text">Analytics</h1>
          <p className="text-white/60 mt-1">Behavioral insights powered by AI.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="input-field !py-2 !text-sm"
            disabled={pets.length === 0}
          >
            {pets.length === 0 && <option>No pets</option>}
            {pets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeRange === r ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/60 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 text-sm py-20 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Crunching GPS data…
        </div>
      ) : pets.length === 0 ? (
        <Card variant="holo" className="p-10 text-center text-white/60">Add a pet to see analytics.</Card>
      ) : history.length < 2 ? (
        <Card variant="holo" className="p-10 text-center text-white/60">
          Not enough location data yet for {pets.find((p) => p.id === selectedPetId)?.name} in this time range —
          go track for a bit and check back.
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={TrendingUp} label="Total distance" value={`${data.totalDistance.toFixed(1)} km`} accent="cyan" />
            <SummaryCard icon={Clock} label="Active time" value={`${Math.floor(data.totalActive / 60)}h ${data.totalActive % 60}m`} accent="purple" />
            <SummaryCard icon={Activity} label="Avg. speed" value={`${data.avgSpeed.toFixed(1)} km/h`} accent="green" />
            <SummaryCard icon={Compass} label="Peak speed" value={`${data.peakSpeed.toFixed(1)} km/h`} accent="amber" />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card variant="holo" className="p-5">
              <div className="font-display text-sm mb-4">Distance per day (km)</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="distance" stroke={COLORS.cyan} fill="url(#distGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card variant="holo" className="p-5">
              <div className="font-display text-sm mb-4">Hourly activity pattern (24h)</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={2} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="activity" stroke={COLORS.green} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card variant="holo" className="p-5 lg:col-span-2">
              <div className="font-display text-sm mb-4">Zone visits</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.zones} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis dataKey="zone" type="category" stroke="rgba(255,255,255,0.4)" fontSize={11} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="visits" fill={COLORS.pink} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: 'cyan' | 'purple' | 'green' | 'amber' }) {
  const colors = {
    cyan: 'from-neon-cyan/20 to-transparent text-neon-cyan',
    purple: 'from-neon-purple/20 to-transparent text-neon-purple',
    green: 'from-neon-green/20 to-transparent text-neon-green',
    amber: 'from-amber-400/20 to-transparent text-amber-400',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card variant="holo" className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-white/50">{label}</div>
            <div className="font-display text-lg">{value}</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}