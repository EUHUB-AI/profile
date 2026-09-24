import type { Trip } from '@/lib/content/collections';

export interface Coord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function hostName(city: string, countryCode: string): string {
  const base = city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}.${countryCode.toLowerCase()}`;
}

export interface Hop {
  n: number;
  trip: Trip;
  host: string;
  km: number;
}

export function traceroute(trips: Trip[], home: Coord): Hop[] {
  return [...trips]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((trip, i) => ({
      n: i + 1,
      trip,
      host: hostName(trip.cities[0].name, trip.countryCode),
      km: Math.round(haversineKm(home, trip.cities[0])),
    }));
}

export function countryCount(trips: Trip[]): number {
  return new Set(trips.map((t) => t.countryCode)).size;
}
