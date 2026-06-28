// Generates realistic demo data when Firebase / backend aren't connected.
// This lets evaluators see the full UX immediately after `npm run dev`.

import type { Pet, Device, GpsLog, Alert } from '@shared/types';

export const DEMO_PETS: Pet[] = [
  {
    id: 'pet_luna',
    ownerId: 'demo_user',
    name: 'Luna',
    species: 'dog',
    breed: 'Golden Retriever',
    age: 4,
    weight: 28,
    color: 'Cream',
    medicalNotes: 'Allergies: peanuts',
    deviceId: 'dev_001',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&q=80',
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now(),
  },
  {
    id: 'pet_kiwi',
    ownerId: 'demo_user',
    name: 'Kiwi',
    species: 'bird',
    breed: 'African Grey Parrot',
    age: 7,
    weight: 0.4,
    color: 'Grey with red tail',
    medicalNotes: 'Wing tracking after rescue',
    deviceId: 'dev_002',
    imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&q=80',
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now(),
  },
  {
    id: 'pet_mocha',
    ownerId: 'demo_user',
    name: 'Mocha',
    species: 'cat',
    breed: 'Bengal',
    age: 3,
    weight: 5,
    color: 'Tabby',
    deviceId: 'dev_003',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
    createdAt: Date.now() - 86400000 * 60,
    updatedAt: Date.now(),
  },
];

export const DEMO_DEVICES: Device[] = [
  {
    id: 'dev_001',
    ownerId: 'demo_user',
    serial: 'FP-A8X-201',
    petId: 'pet_luna',
    status: 'online',
    battery: 87,
    lastSync: Date.now() - 4000,
    firmware: 'v2.4.1',
    apiKey: 'hashed',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'dev_002',
    ownerId: 'demo_user',
    serial: 'FP-A8X-301',
    petId: 'pet_kiwi',
    status: 'low_battery',
    battery: 18,
    lastSync: Date.now() - 30_000,
    firmware: 'v2.4.1',
    apiKey: 'hashed',
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'dev_003',
    ownerId: 'demo_user',
    serial: 'FP-A8X-205',
    petId: 'pet_mocha',
    status: 'online',
    battery: 64,
    lastSync: Date.now() - 12_000,
    firmware: 'v2.4.1',
    apiKey: 'hashed',
    createdAt: Date.now() - 86400000 * 60,
  },
];

/**
 * Generate a believable GPS walk for a pet, simulating real animal
 * movement: occasional bursts, gradual direction changes, stops.
 * Default centers around Lahore, Pakistan (matches user's locale).
 */
export function generateGpsHistory(
  petId: string,
  deviceId: string,
  count = 80,
  center = { lat: 31.5204, lng: 74.3587 },
  spreadKm = 0.8
): GpsLog[] {
  const logs: GpsLog[] = [];
  let lat = center.lat;
  let lng = center.lng;
  let heading = Math.random() * 360;
  let speed = 0.5 + Math.random() * 1.2; // m/s walk pace

  const now = Date.now();
  const stepSec = 30; // sample every 30s

  for (let i = 0; i < count; i++) {
    // Occasionally change behavior
    if (Math.random() < 0.08) heading += (Math.random() - 0.5) * 120;
    else heading += (Math.random() - 0.5) * 30;

    if (Math.random() < 0.1) speed = Math.max(0, speed + (Math.random() - 0.5) * 2);

    // Move
    const distance = speed * stepSec; // meters
    const dLat = (distance * Math.cos((heading * Math.PI) / 180)) / 111111;
    const dLng = (distance * Math.sin((heading * Math.PI) / 180)) / (111111 * Math.cos((lat * Math.PI) / 180));
    lat += dLat;
    lng += dLng;

    // Stay within spread
    const maxOffset = spreadKm / 111;
    lat = Math.max(center.lat - maxOffset, Math.min(center.lat + maxOffset, lat));
    lng = Math.max(center.lng - maxOffset, Math.min(center.lng + maxOffset, lng));

    logs.push({
      id: `gps_${petId}_${i}`,
      deviceId,
      petId,
      ownerId: 'demo_user',
      lat,
      lng,
      speed,
      bearing: heading,
      accuracy: 5 + Math.random() * 10,
      battery: 80 - i * 0.1,
      timestamp: now - (count - i) * stepSec * 1000,
    });
  }

  return logs;
}

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'a1',
    ownerId: 'demo_user',
    petId: 'pet_luna',
    deviceId: 'dev_001',
    type: 'geofence_exit',
    severity: 'high',
    title: 'Luna left safe zone',
    message: 'Luna crossed the "Home garden" geofence at 14:32.',
    read: false,
    createdAt: Date.now() - 600_000,
  },
  {
    id: 'a2',
    ownerId: 'demo_user',
    petId: 'pet_kiwi',
    deviceId: 'dev_002',
    type: 'low_battery',
    severity: 'medium',
    title: 'Kiwi tag low battery',
    message: 'Battery dropped to 18%. Charge within 12 hours.',
    read: false,
    createdAt: Date.now() - 1_800_000,
  },
  {
    id: 'a3',
    ownerId: 'demo_user',
    petId: 'pet_luna',
    deviceId: 'dev_001',
    type: 'abnormal_movement',
    severity: 'medium',
    title: 'AI detected unusual pattern',
    message: 'Sharp direction reversal — confidence 89%.',
    read: true,
    createdAt: Date.now() - 7_200_000,
  },
  {
    id: 'a4',
    ownerId: 'demo_user',
    petId: 'pet_mocha',
    deviceId: 'dev_003',
    type: 'inactive',
    severity: 'low',
    title: 'Mocha has been still for 4 hours',
    message: 'Likely napping. No action required.',
    read: true,
    createdAt: Date.now() - 14_400_000,
  },
];
