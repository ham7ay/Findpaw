import { useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  useMap,
  Marker,
} from 'react-leaflet';
import L from 'leaflet';
import type { GpsLog } from '@shared/types';
import type { PredictionResult } from '@/services/aiPredictor';

// Fix Leaflet's default-icon Webpack path issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const liveIcon = L.divIcon({
  html: '<div class="live-marker"></div>',
  className: 'live-marker-wrapper',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const predictedIcon = L.divIcon({
  html: '<div class="predicted-marker"></div>',
  className: 'predicted-marker-wrapper',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';

const TILE_ATTR = MAPBOX_TOKEN
  ? '© Mapbox © OpenStreetMap'
  : '© OpenStreetMap © CARTO';

interface TrackingMapProps {
  history: GpsLog[];
  prediction?: PredictionResult | null;
  geofences?: { center: { lat: number; lng: number }; radius: number; isSafeZone: boolean; name?: string }[];
  followLive?: boolean;
  showConfidenceCone?: boolean;
  height?: string | number;
  center?: [number, number];
  zoom?: number;
}

export default function TrackingMap({
  history,
  prediction = null,
  geofences = [],
  followLive = true,
  showConfidenceCone = true,
  height = '100%',
  center: centerProp,
  zoom = 16,
}: TrackingMapProps) {
  const current = history[history.length - 1];

  const center = useMemo<[number, number]>(() => {
    if (centerProp) return centerProp;
    if (current) return [current.lat, current.lng];
    return [31.5204, 74.3587]; // Lahore default
  }, [centerProp, current?.lat, current?.lng]);

  const trail = history.map((h) => [h.lat, h.lng] as [number, number]);
  const predictions = prediction?.points ?? [];
  const predTrail = predictions.length && current
    ? [[current.lat, current.lng] as [number, number], ...predictions.map((p) => [p.lat, p.lng] as [number, number])]
    : [];

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      attributionControl
      zoomControl
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

      {/* Geofences */}
      {geofences.map((g, i) => (
        <Circle
          key={i}
          center={[g.center.lat, g.center.lng]}
          radius={g.radius}
          pathOptions={{
            color: g.isSafeZone ? '#10b981' : '#ec4899',
            fillColor: g.isSafeZone ? '#10b981' : '#ec4899',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '6 6',
          }}
        />
      ))}

      {/* Historical trail */}
      {trail.length > 1 && (
        <Polyline
          positions={trail}
          pathOptions={{
            color: '#06b6d4',
            weight: 3,
            opacity: 0.85,
          }}
        />
      )}

      {/* Predicted trail */}
      {predTrail.length > 1 && (
        <Polyline
          positions={predTrail}
          pathOptions={{
            color: '#8b5cf6',
            weight: 3,
            opacity: 0.9,
            dashArray: '8 6',
          }}
        />
      )}

      {/* Predicted points */}
      {predictions.map((p, i) => (
        <Marker key={`pred-${i}`} position={[p.lat, p.lng]} icon={predictedIcon} />
      ))}

      {/* Confidence cone — circle expands toward last predicted point */}
      {showConfidenceCone && predictions.length > 0 && (
        <Circle
          center={[predictions[predictions.length - 1].lat, predictions[predictions.length - 1].lng]}
          radius={50 + (1 - predictions[predictions.length - 1].confidence) * 250}
          pathOptions={{
            color: '#8b5cf6',
            fillColor: '#8b5cf6',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '3 4',
          }}
        />
      )}

      {/* History markers (subtle dots) */}
      {history.slice(0, -1).map((h) => (
        <CircleMarker
          key={h.id}
          center={[h.lat, h.lng]}
          radius={2.5}
          pathOptions={{
            color: '#06b6d4',
            fillColor: '#06b6d4',
            fillOpacity: 0.5,
            weight: 0,
          }}
        />
      ))}

      {/* Current live marker */}
      {current && (
        <Marker position={[current.lat, current.lng]} icon={liveIcon} />
      )}

      {followLive && current && <FollowLive lat={current.lat} lng={current.lng} />}
    </MapContainer>
  );
}

function FollowLive({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}
