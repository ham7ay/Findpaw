import type { Geofence } from '../../../shared/types.js';

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export interface BreachEvent {
  geofenceId: string;
  geofenceName: string;
  type: 'enter' | 'exit';
  isSafeZone: boolean;
}

/**
 * Compare two GPS positions against a list of geofences and return any
 * enter/exit transitions.
 */
export function checkGeofenceBreach(
  previous: { lat: number; lng: number } | null,
  current: { lat: number; lng: number },
  geofences: Geofence[]
): BreachEvent[] {
  const events: BreachEvent[] = [];

  for (const g of geofences) {
    const insideNow = haversine(current, g.center) <= g.radius;
    const insideThen = previous ? haversine(previous, g.center) <= g.radius : insideNow;

    if (insideNow && !insideThen) {
      events.push({ geofenceId: g.id, geofenceName: g.name, type: 'enter', isSafeZone: g.isSafeZone });
    } else if (!insideNow && insideThen) {
      events.push({ geofenceId: g.id, geofenceName: g.name, type: 'exit', isSafeZone: g.isSafeZone });
    }
  }

  return events;
}
