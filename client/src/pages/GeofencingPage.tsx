import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Shield, ChevronDown, History, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TrackingMap from '@/components/map/TrackingMap';
import { petApi, geofenceApi, alertApi, gpsApi } from '@/services/api';
import { useGpsStream } from '@/services/socket';
import { haversine } from '@/lib/utils';
import type { Pet, Geofence, Alert, GpsLog } from '@shared/types';

export default function GeofencingPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [petMenuOpen, setPetMenuOpen] = useState(false);

  const [zones, setZones] = useState<Geofence[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [savingZone, setSavingZone] = useState(false);

  const [history, setHistory] = useState<GpsLog[]>([]);
  const [zoneHistory, setZoneHistory] = useState<Alert[]>([]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  useEffect(() => {
    (async () => {
      try {
        const list = await petApi.list();
        setPets(list);
        if (list.length) setSelectedPetId(list[0].id);
      } finally {
        setLoadingPets(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedPetId) return;
    setLoadingZones(true);
    (async () => {
      try {
        const [zoneList, history_, alerts] = await Promise.all([
          geofenceApi.list(selectedPetId),
          gpsApi.history(selectedPetId, { limit: 300 }),
          alertApi.list({ limit: 100 }),
        ]);
        setZones(zoneList);
        setSelectedZoneId(zoneList[0]?.id ?? null);
        setHistory(history_);
        setZoneHistory(
          alerts.filter(
            (a) => a.petId === selectedPetId && (a.type === 'geofence_enter' || a.type === 'geofence_exit')
          )
        );
      } finally {
        setLoadingZones(false);
      }
    })();
  }, [selectedPetId]);

  useGpsStream(selectedPetId || undefined, (log) => {
    setHistory((h) => [...h, log].slice(-500));
  });

  const current = history[history.length - 1];
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  const zoneStatus = useMemo(
    () =>
      zones.map((z) => {
        if (!current || !z.center || z.radius === undefined) {
          return { ...z, distance: null as number | null, inside: false };
        }
        const distance = haversine(current, z.center);
        return { ...z, distance, inside: distance <= z.radius };
      }),
    [zones, current]
  );

  const compliance = useMemo(() => {
    if (!selectedZone || !selectedZone.center || selectedZone.radius === undefined || history.length === 0) return null;
    const insideCount = history.filter((p) => haversine(p, selectedZone.center!) <= selectedZone.radius!).length;
    return Math.round((insideCount / history.length) * 100);
  }, [history, selectedZone]);

  const addZoneAt = async (pos: { lat: number; lng: number }) => {
    if (!selectedPetId) return;
    setSavingZone(true);
    try {
      const zone = await geofenceApi.create({
        name: `Zone ${zones.length + 1}`,
        petId: selectedPetId,
        center: pos,
        radius: 200,
        isSafeZone: true,
        active: true,
      });
      setZones((z) => [...z, zone]);
      setSelectedZoneId(zone.id);
    } finally {
      setSavingZone(false);
      setPlacing(false);
    }
  };

  const updateZone = async (id: string, patch: Partial<{ name: string; radius: number; isSafeZone: boolean; active: boolean }>) => {
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z))); // optimistic
    try {
      await geofenceApi.update(id, patch);
    } catch {
      // best-effort — UI already updated optimistically
    }
  };

  const deleteZone = async (id: string) => {
    setZones((zs) => zs.filter((z) => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
    try {
      await geofenceApi.remove(id);
    } catch {
      // best-effort
    }
  };

  if (loadingPets) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!selectedPet) {
    return (
      <Card variant="holo" className="p-10 text-center">
        <Shield className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <div className="text-white/60">Add a pet first to set up geofencing.</div>
      </Card>
    );
  }

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
              {pets.map((p) => (
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

      {!current && !loadingZones && (
        <Card variant="holo" className="p-4 text-sm text-white/60">
          No location data yet for {selectedPet.name} — the map will center on a default location until your tracker sends a fix.
        </Card>
      )}

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
              disabled={savingZone}
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
              center={current ? [current.lat, current.lng] : undefined}
              geofences={zones
                .filter((z) => z.center && z.radius !== undefined)
                .map((z) => ({ center: z.center!, radius: z.radius!, isSafeZone: z.isSafeZone, name: z.name }))}
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
            {loadingZones ? (
              <div className="text-xs text-white/40 text-center py-4 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading zones…
              </div>
            ) : (
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
                      {z.distance !== null && (
                        <span className={`badge ${z.inside ? 'badge-green' : 'badge-pink'}`}>
                          {z.inside ? 'INSIDE' : 'OUTSIDE'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-1 font-mono">
                      {z.distance !== null ? `${Math.round(z.distance)}m from center · ` : ''}radius {z.radius}m
                    </div>
                  </button>
                ))}
                {zones.length === 0 && (
                  <div className="text-xs text-white/40 text-center py-4">No zones yet — click "Add safe zone".</div>
                )}
              </div>
            )}
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