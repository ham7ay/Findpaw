import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Activity, Clock, Compass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DEMO_PETS } from '@/services/demoData';

const COLORS = {
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  green: '#10b981',
  amber: '#f59e0b',
};

// Seeded random for deterministic charts
function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function AnalyticsPage() {
  const [selectedPetId, setSelectedPetId] = useState(DEMO_PETS[0].id);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const data = useMemo(() => {
    const rand = seedRand(selectedPetId.length + (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const daily = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        date: days <= 7 ? labels[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
        distance: Math.round((rand() * 8 + 2) * 10) / 10,
        activeMinutes: Math.round(rand() * 180 + 60),
        avgSpeed: Math.round((rand() * 3 + 1) * 10) / 10,
        topSpeed: Math.round((rand() * 6 + 3) * 10) / 10,
      };
    });

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, '0')}:00`,
      activity: Math.round(
        rand() * 100 * (h >= 6 && h <= 9 ? 1.5 : h >= 17 && h <= 20 ? 1.3 : h >= 22 || h <= 5 ? 0.2 : 0.7)
      ),
    }));

    const zones = [
      { zone: 'Home', visits: Math.round(rand() * 30 + 20) },
      { zone: 'Backyard', visits: Math.round(rand() * 25 + 15) },
      { zone: 'Park', visits: Math.round(rand() * 15 + 5) },
      { zone: 'Street', visits: Math.round(rand() * 10 + 2) },
      { zone: 'Unknown', visits: Math.round(rand() * 5) },
    ];

    const behavior = [
      { trait: 'Activity', value: Math.round(rand() * 40 + 50) },
      { trait: 'Exploration', value: Math.round(rand() * 40 + 40) },
      { trait: 'Sociability', value: Math.round(rand() * 40 + 50) },
      { trait: 'Rest', value: Math.round(rand() * 30 + 60) },
      { trait: 'Stamina', value: Math.round(rand() * 40 + 50) },
      { trait: 'Curiosity', value: Math.round(rand() * 40 + 50) },
    ];

    const totalDistance = daily.reduce((s, d) => s + d.distance, 0);
    const totalActive = daily.reduce((s, d) => s + d.activeMinutes, 0);
    const avgSpeed = daily.reduce((s, d) => s + d.avgSpeed, 0) / daily.length;
    const peakSpeed = Math.max(...daily.map((d) => d.topSpeed));

    return { daily, hourly, zones, behavior, totalDistance, totalActive, avgSpeed, peakSpeed };
  }, [selectedPetId, timeRange]);

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
          >
            {DEMO_PETS.map((p) => (
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={TrendingUp} label="Total distance" value={`${data.totalDistance.toFixed(1)} km`} accent="cyan" />
        <SummaryCard icon={Clock} label="Active time" value={`${Math.round(data.totalActive / 60)}h ${data.totalActive % 60}m`} accent="purple" />
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
          <div className="font-display text-sm mb-4">Active minutes per day</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="activeMinutes" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
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

        <Card variant="holo" className="p-5">
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

        <Card variant="holo" className="p-5 lg:col-span-2">
          <div className="font-display text-sm mb-4">Behavioral fingerprint</div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.behavior}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="trait" stroke="rgba(255,255,255,0.6)" fontSize={11} />
              <PolarRadiusAxis stroke="rgba(255,255,255,0.2)" fontSize={10} />
              <Radar name="Score" dataKey="value" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
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
