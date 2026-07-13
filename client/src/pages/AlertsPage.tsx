import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, AlertTriangle, Shield, MapPin, Battery, Filter, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { alertApi } from '@/services/api';
import { timeAgo, formatDate } from '@/lib/utils';
import type { Alert } from '@shared/types';

const severityOrder = ['critical', 'high', 'medium', 'low'] as const;

const typeIcon = (t: Alert['type']) => {
  switch (t) {
    case 'geofence_exit':
    case 'geofence_enter': return Shield;
    case 'abnormal_movement':
    case 'speed_anomaly':
    case 'escape': return AlertTriangle;
    case 'low_battery': return Battery;
    case 'inactive': return MapPin;
    default: return BellRing;
  }
};

const severityClass = (s: Alert['severity']) => {
  switch (s) {
    case 'critical': return 'border-neon-pink/40 bg-neon-pink/5';
    case 'high': return 'border-amber-400/40 bg-amber-400/5';
    case 'medium': return 'border-neon-cyan/40 bg-neon-cyan/5';
    default: return 'border-white/10 bg-white/[0.02]';
  }
};

const severityBadge = (s: Alert['severity']) => {
  switch (s) {
    case 'critical': return 'badge-pink';
    case 'high': return 'badge-amber';
    case 'medium': return 'badge-cyan';
    default: return 'badge-green';
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | Alert['severity']>('all');

  useEffect(() => {
    (async () => {
      try {
        setAlerts(await alertApi.list({ limit: 200 }));
      } catch (err: any) {
        setLoadError(err.message ?? 'Could not load alerts');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = alerts;
    if (filter === 'unread') result = result.filter((a) => !a.read);
    else if (filter !== 'all') result = result.filter((a) => a.severity === filter);
    return [...result].sort(
      (a, b) =>
        severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) ||
        b.createdAt - a.createdAt
    );
  }, [alerts, filter]);

  const markRead = async (id: string) => {
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, read: true } : a)));
    try {
      await alertApi.markRead(id);
    } catch {
      // best-effort — leave the optimistic update in place
    }
  };

  const markAllRead = async () => {
    setAlerts((as) => as.map((a) => ({ ...a, read: true })));
    try {
      await alertApi.markAllRead();
    } catch {
      // best-effort
    }
  };

  const counts = {
    all: alerts.length,
    unread: alerts.filter((a) => !a.read).length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text">Alerts</h1>
          <p className="text-white/60 mt-1">Real-time notifications from your tracking network.</p>
        </div>
        {counts.unread > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <Check className="w-4 h-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-white/40" />
        {[
          { key: 'all' as const, label: 'All', count: counts.all },
          { key: 'unread' as const, label: 'Unread', count: counts.unread },
          { key: 'critical' as const, label: 'Critical', count: counts.critical },
          { key: 'high' as const, label: 'High', count: counts.high },
          { key: 'medium' as const, label: 'Medium', count: counts.medium },
          { key: 'low' as const, label: 'Low', count: counts.low },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
              filter === f.key
                ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
            }`}
          >
            {f.label} <span className="ml-1 opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-white/50 text-sm py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading alerts…
          </div>
        ) : loadError ? (
          <Card variant="holo" className="p-6 text-center text-neon-pink text-sm">{loadError}</Card>
        ) : filtered.length === 0 ? (
          <Card variant="holo" className="p-10 text-center">
            <BellRing className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <div className="text-white/60">No alerts to show.</div>
          </Card>
        ) : (
          filtered.map((alert, i) => {
            const Icon = typeIcon(alert.type);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className={`p-4 border ${severityClass(alert.severity)} ${
                    !alert.read ? 'shadow-glow' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'critical' ? 'bg-neon-pink/15 text-neon-pink' :
                      alert.severity === 'high' ? 'bg-amber-400/15 text-amber-400' :
                      alert.severity === 'medium' ? 'bg-neon-cyan/15 text-neon-cyan' :
                      'bg-white/10 text-white/60'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display text-sm">{alert.title}</div>
                        <span className={`badge ${severityBadge(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {!alert.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                        )}
                      </div>
                      <div className="text-sm text-white/70 mt-1">{alert.message}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                        <span>{timeAgo(alert.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono">{formatDate(alert.createdAt)}</span>
                        {alert.petId && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{alert.petId}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!alert.read && (
                      <button
                        onClick={() => markRead(alert.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-neon-cyan transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}