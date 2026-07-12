import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Bell, Shield, ChevronDown, History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TrackingMap from '@/components/map/TrackingMap';
import { DEMO_PETS, DEMO_ALERTS, generateGpsHistory } from '@/services/demoData';
import { haversine } from '@/lib/utils';

// -----------------------------------------------------------------------
// This page runs in the same "demo mode" as the rest of the app (see
// DashboardPage / LiveTrackingPage — none of them call the real API yet).
// Zones live in local component state.
//
// The backend is already fully built for this feature:
//   shared/types.ts            -> Geofence type
//   server/src/routes/geofences.ts   -> CRUD endpoints
//   server/src/services/geofenceService.ts -> enter/exit breach detection
//   client/src/services/api.ts -> geofenceApi wrapper (added)
// To go live: replace the local `zones` state below with
// `geofenceApi.list()/.create()/.update()/.remove()` calls.
// -----------------------------------------------------------------------

interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // meters
  isSafeZone: boolean;
  notifyDashboard: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
}

const DEFAULT_ZONES: Zone[] = [
  { id: 'z1', name: 'Home', lat: 31.5204, lng: 74.3587, radius: 150, isSafeZone: true, notifyDashboard: true, notifyEmail: true, notifyPush: true },
  { id: 'z2', name: 'Park', lat: 31.5240, lng: 74.3620, radius: 300, isSafeZone: true, notifyDashboard: true, notifyEmail: false, notifyPush: true },
];

export default function GeofencingPage() {
  const [selectedPetId, setSelectedPetId] = useState(DEMO_PETS[0].id);
  const [petMenuOpen, setPetMenuOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(zones[0]?.id ?? null);
  const [placing, setPlacing] = useState(false);

  const selectedPet = DEMO_PETS.find((p) => p.id === selectedPetId)!;

  // Simulated live position for the selected pet (same pattern as other pages)
  const history = useMemo(
    () => generateGpsHistory(selectedPet.id, `device-${selectedPet.id}`, 60),
    [selectedPet.id]
  );
  const current = history[history.length - 1];

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  // Per-zone live status: distance from center + inside/outside
  const zoneStatus = useMemo(
    () =>
      zones.map((z) => {
        const distance = haversine(current, { lat: z.lat, lng: z.lng });
        return { ...z, distance, inside: distance <= z.radius };
      }),
    [zones, current]
  );

  const zoneHistory = DEMO_ALERTS.filter(
    (a) => a.type === 'geofence_enter' || a.type === 'geofence_exit'
  );

  // Rough compliance stat: % of the simulated history inside the selected zone
  const compliance = useMemo(() => {
    if (!selectedZone) return null;
    const insideCount = history.filter((p) => haversine(p, { lat: selectedZone.lat, lng: selectedZone.lng }) <= selectedZone.radius).length;
    return Math.round((insideCount / history.length) * 100);
  }, [history, selectedZone]);

  const addZoneAt = (pos: { lat: number; lng: number }) => {
    const id = `z-${Date.now()}`;
    const zone: Zone = {
      id,
      name: `New Zone ${zones.length + 1}`,
      lat: pos.lat,
      lng: pos.lng,
      radius: 200,
      isSafeZone: true,
      notifyDashboard: true,
      notifyEmail: false,
      notifyPush: true,
    };
    setZones((z) => [...z, zone]);
    setSelectedZoneId(id);
    setPlacing(false);
  };

  const updateZone = (id: string, patch: Partial<Zone>) => {
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };

  const deleteZone = (id: string) => {
    setZones((zs) => zs.filter((z) => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
  };

  useEffect(() => {
    if (!zones.find((z) => z.id === selectedZoneId)) {
      setSelectedZoneId(zones[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text">Geofencing</h1>
          <p className="text-white/60 mt-1">Safe zones, boundaries and real-time inside/outside status.</p>
        </div>

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
                    setSelectedPetId(p.id);
                    setPetMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                    p.id === selectedPet.id ? 'bg-white/[0.03] text-neon-cyan' : ''
                  }`}
                >
                  <span className="text-lg">{p.species === 'dog' ? '🐕' : p.species === 'cat' ? '🐈' : '🐾'}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <Card variant="holo" className="lg:col-span-3 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neon-green" />
              <div className="font-display text-sm">Interactive safe-zone map</div>
            </div>
            <Button
              variant={placing ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPlacing((p) => !p)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {placing ? 'Click map to place…' : 'Add safe zone'}
            </Button>
          </div>
          <div className="h-[560px]">
            <TrackingMap
              history={history}
              prediction={null}
              followLive={false}
              center={[current.lat, current.lng]}
              geofences={zones.map((z) => ({ center: { lat: z.lat, lng: z.lng }, radius: z.radius, isSafeZone: z.isSafeZone, name: z.name }))}
              onMapClick={placing ? addZoneAt : undefined}
            />
          </div>
        </Card>

        {/* Zone list + editor */}
        <div className="space-y-4">
          <Card variant="holo" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-neon-cyan" />
              <div className="font-display text-sm">Safe zones ({zones.length})</div>
            </div>
            <div className="space-y-2">
              {zoneStatus.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    z.id === selectedZoneId ? 'border-neon-cyan/50 bg-white/[0.04]' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{z.name}</span>
                    <span className={`badge ${z.inside ? 'badge-green' : 'badge-pink'}`}>
                      {z.inside ? 'INSIDE' : 'OUTSIDE'}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-1 font-mono">
                    {Math.round(z.distance)}m from center · radius {z.radius}m
                  </div>
                </button>
              ))}
              {zones.length === 0 && (
                <div className="text-xs text-white/40 text-center py-4">No zones yet — click "Add safe zone".</div>
              )}
            </div>
          </Card>

          {selectedZone && (
            <Card variant="holo" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display text-sm">Edit zone</div>
                <button onClick={() => deleteZone(selectedZone.id)} className="text-white/40 hover:text-neon-pink transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Name</label>
                  <input
                    className="input-field !py-2 !text-sm"
                    value={selectedZone.name}
                    onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">Radius</span>
                    <span className="font-mono text-neon-cyan">{selectedZone.radius}m</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={1000}
                    step={25}
                    value={selectedZone.radius}
                    onChange={(e) => updateZone(selectedZone.id, { radius: Number(e.target.value) })}
                    className="w-full accent-neon-cyan"
                  />
                </div>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-white/60">Safe zone (stay-in) vs avoid zone</span>
                  <input
                    type="checkbox"
                    checked={selectedZone.isSafeZone}
                    onChange={(e) => updateZone(selectedZone.id, { isSafeZone: e.target.checked })}
                    className="accent-neon-cyan"
                  />
                </label>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
                    <Bell className="w-3.5 h-3.5" /> Notification preferences
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white/60">Dashboard</span>
                      <input type="checkbox" checked={selectedZone.notifyDashboard} onChange={(e) => updateZone(selectedZone.id, { notifyDashboard: e.target.checked })} className="accent-neon-cyan" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white/60">Email</span>
                      <input type="checkbox" checked={selectedZone.notifyEmail} onChange={(e) => updateZone(selectedZone.id, { notifyEmail: e.target.checked })} className="accent-neon-cyan" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white/60">Push</span>
                      <input type="checkbox" checked={selectedZone.notifyPush} onChange={(e) => updateZone(selectedZone.id, { notifyPush: e.target.checked })} className="accent-neon-cyan" />
                    </label>
                  </div>
                </div>

                {compliance !== null && (
                  <div className="pt-3 border-t border-white/10 flex justify-between text-xs">
                    <span className="text-white/60">Compliance (last {history.length} pts)</span>
                    <span className="font-mono text-neon-green">{compliance}%</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Zone history */}
      <Card variant="holo" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-amber-400" />
          <div className="font-display text-sm">Zone history</div>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {zoneHistory.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${a.type === 'geofence_exit' ? 'bg-neon-pink' : 'bg-neon-green'}`} />
                  <div>
                    <div className="text-sm">{a.title}</div>
                    <div className="text-xs text-white/50">{a.message}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {zoneHistory.length === 0 && (
            <div className="text-xs text-white/40 text-center py-4">No enter/exit events yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}