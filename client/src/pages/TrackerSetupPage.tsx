import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, MapPin, Play, Square, Trash2, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { petApi, deviceApi, BASE } from '@/services/api';
import type { Pet, Species } from '@shared/types';

const STORAGE_KEY = 'findpaw_phone_device';

interface StoredDevice {
  deviceId: string;
  deviceKey: string;
  petId: string;
  petName: string;
  serial: string;
}

export default function TrackerSetupPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [petError, setPetError] = useState<string | null>(null);

  // Quick "add pet" inline form (in case they have no pets yet)
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState<Species>('dog');
  const [addingPet, setAddingPet] = useState(false);

  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [device, setDevice] = useState<StoredDevice | null>(null);

  const [tracking, setTracking] = useState(false);
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number; accuracy: number; speed: number; heading: number; at: number } | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  // Load stored device registration + pet list on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setDevice(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    (async () => {
      try {
        const list = await petApi.list();
        setPets(list);
        if (list.length && !selectedPetId) setSelectedPetId(list[0].id);
      } catch (err: any) {
        setPetError(err.message ?? 'Could not load pets');
      } finally {
        setLoadingPets(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, []);

  const handleAddPet = async () => {
    if (!newPetName.trim()) return;
    setAddingPet(true);
    try {
      const pet = await petApi.create({ name: newPetName.trim(), species: newPetSpecies });
      setPets((p) => [...p, pet]);
      setSelectedPetId(pet.id);
      setShowAddPet(false);
      setNewPetName('');
    } catch (err: any) {
      setPetError(err.message ?? 'Could not create pet');
    } finally {
      setAddingPet(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedPetId) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      const pet = pets.find((p) => p.id === selectedPetId)!;
      const result = await deviceApi.create({
        serial: `tag-${Date.now()}`,
        petId: selectedPetId,
        firmware: 'browser-gps-v1',
      });
      const stored: StoredDevice = {
        deviceId: result.id,
        deviceKey: result.rawKey,
        petId: selectedPetId,
        petName: pet.name,
        serial: result.serial,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setDevice(stored);
    } catch (err: any) {
      setRegisterError(err.message ?? 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const forgetDevice = async () => {
    if (device) {
      try {
        await deviceApi.remove(device.deviceId);
      } catch {
        // best-effort — still forget it locally even if the API call fails
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setDevice(null);
    stopTracking();
  };

  const sendFix = async (pos: GeolocationPosition) => {
    if (!device) return;
    const { latitude, longitude, accuracy, speed, heading, altitude } = pos.coords;

    setLastFix({
      lat: latitude,
      lng: longitude,
      accuracy: accuracy ?? 0,
      speed: speed ?? 0,
      heading: heading ?? 0,
      at: pos.timestamp,
    });

    // Throttle uploads to at most once every 5s even if the browser fires faster
    const now = Date.now();
    if (now - lastSentRef.current < 5000) return;
    lastSentRef.current = now;

    try {
      const res = await fetch(`${BASE}/api/gps/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': device.deviceId,
          'X-Device-Key': device.deviceKey,
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          speed: speed ?? 0,
          bearing: heading ?? 0,
          accuracy: accuracy ?? 0,
          altitude: altitude ?? undefined,
          timestamp: now,
        }),
      });
      if (res.ok) {
        setPingCount((c) => c + 1);
        setGeoError(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setGeoError(body.error ?? `Upload failed (HTTP ${res.status})`);
      }
    } catch {
      setGeoError('Network error while uploading — will keep retrying.');
    }
  };

  const startTracking = async () => {
    if (!device) return;
    if (!window.isSecureContext) {
      setGeoError('This page must be opened over HTTPS for GPS access to work.');
      return;
    }
    if (!('geolocation' in navigator)) {
      setGeoError('This browser does not support geolocation.');
      return;
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock?.request?.('screen');
    } catch {
      // wake lock not supported/allowed — non-fatal, screen may just sleep
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendFix(pos),
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    setTracking(true);
    setGeoError(null);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    wakeLockRef.current?.release?.().catch(() => {});
    setTracking(false);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold neon-text flex items-center gap-2">
          <Radio className="w-6 h-6" /> Connect Your GPS Tracker
        </h1>
        <p className="text-white/60 mt-1 text-sm">
          Set up and activate your pet's GPS tracking device below.
        </p>
      </div>

      {!window.isSecureContext && (
        <Card variant="holo" className="p-4 border-amber-400/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            This page isn't running over HTTPS. Browsers block GPS access on insecure pages — open your deployed (https) URL instead.
          </div>
        </Card>
      )}

      {/* Step 1: pick / create pet */}
      {!device && (
        <Card variant="holo" className="p-5">
          <div className="font-display text-sm mb-4">1. Which pet is this tracker for?</div>
          {loadingPets ? (
            <div className="text-sm text-white/50">Loading your pets…</div>
          ) : petError ? (
            <div className="text-sm text-neon-pink">{petError}</div>
          ) : pets.length === 0 && !showAddPet ? (
            <div className="text-sm text-white/60">
              You don't have any pets yet.
              <button onClick={() => setShowAddPet(true)} className="ml-2 text-neon-cyan hover:text-white inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add one
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pets.length > 0 && (
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="input-field !py-2 !text-sm w-full"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              {!showAddPet && (
                <button onClick={() => setShowAddPet(true)} className="text-xs text-neon-cyan hover:text-white inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add a different pet
                </button>
              )}
            </div>
          )}

          {showAddPet && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <input
                className="input-field !py-2 !text-sm w-full"
                placeholder="Pet name"
                value={newPetName}
                onChange={(e) => setNewPetName(e.target.value)}
              />
              <select
                value={newPetSpecies}
                onChange={(e) => setNewPetSpecies(e.target.value as Species)}
                className="input-field !py-2 !text-sm w-full"
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="cattle">Cattle</option>
                <option value="other">Other</option>
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddPet} disabled={addingPet || !newPetName.trim()}>
                  {addingPet ? 'Adding…' : 'Add pet'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowAddPet(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {pets.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="font-display text-sm mb-2">2. Activate the tracker</div>
              <p className="text-xs text-white/50 mb-3">
                This activates GPS tracking for the selected pet.
              </p>
              {registerError && <div className="text-xs text-neon-pink mb-2">{registerError}</div>}
              <Button onClick={handleRegister} disabled={registering || !selectedPetId}>
                {registering ? 'Activating…' : 'Activate tracker'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: tracking controls */}
      {device && (
        <>
          <Card variant="holo" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neon-green" />
                <div className="font-display text-sm">Tracker connected</div>
              </div>
              <button onClick={forgetDevice} className="text-white/40 hover:text-neon-pink transition-colors" title="Remove this tracker">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-white/70">
              Tracking for <span className="text-neon-cyan">{device.petName}</span>
            </div>
            <div className="text-xs text-white/40 font-mono mt-1">device: {device.serial}</div>

            <div className="mt-5">
              {!tracking ? (
                <Button onClick={startTracking} className="w-full">
                  <Play className="w-4 h-4 mr-1.5" /> Start tracking
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="secondary" className="w-full">
                  <Square className="w-4 h-4 mr-1.5" /> Stop tracking
                </Button>
              )}
            </div>

            {tracking && (
              <div className="mt-3 flex items-center gap-2 text-xs text-neon-green">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-neon-green" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-neon-green animate-ping" />
                </div>
                Live — keep this tab open and your screen on
              </div>
            )}

            {geoError && (
              <div className="mt-3 text-xs text-neon-pink flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {geoError}
              </div>
            )}
          </Card>

          {lastFix && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card variant="holo" className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-neon-cyan" />
                  <div className="font-display text-sm">Last fix</div>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Latitude" value={lastFix.lat.toFixed(5)} />
                  <Row label="Longitude" value={lastFix.lng.toFixed(5)} />
                  <Row label="Accuracy" value={`±${Math.round(lastFix.accuracy)}m`} />
                  <Row label="Speed" value={`${(lastFix.speed ?? 0).toFixed(1)} m/s`} />
                  <Row label="Pings sent" value={String(pingCount)} />
                  <Row label="At" value={new Date(lastFix.at).toLocaleTimeString()} />
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}