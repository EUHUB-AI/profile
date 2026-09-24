import { describe, expect, it } from 'vitest';
import type { Trip } from '@/lib/content/collections';
import { countryCount, haversineKm, hostName, traceroute } from './travel';

const BRATISLAVA = { lat: 48.1486, lng: 17.1077 };

function trip(slug: string, start: string, countryCode: string, city: { name: string; lat: number; lng: number }): Trip {
  return { slug, start, countryCode, title: slug, country: countryCode, cities: [city], sample: false, body: '' };
}

describe('haversineKm', () => {
  it('measures great-circle distance', () => {
    expect(haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 })).toBeCloseTo(343.6, 0);
  });

  it('is zero for the same point', () => {
    expect(haversineKm(BRATISLAVA, BRATISLAVA)).toBe(0);
  });
});

describe('hostName', () => {
  it('strips accents', () => {
    expect(hostName('Reykjavík', 'IS')).toBe('reykjavik.is');
  });

  it('turns spaces and punctuation into single hyphens', () => {
    expect(hostName('Rio de Janeiro', 'BR')).toBe('rio-de-janeiro.br');
    expect(hostName("St. John's", 'CA')).toBe('st-john-s.ca');
  });
});

describe('traceroute', () => {
  it('numbers trips as hops in date order with distance from home', () => {
    const hops = traceroute(
      [
        trip('japan', '2025-04', 'JP', { name: 'Tokyo', lat: 35.6762, lng: 139.6503 }),
        trip('portugal', '2024-05', 'PT', { name: 'Lisbon', lat: 38.7223, lng: -9.1393 }),
      ],
      BRATISLAVA,
    );
    expect(hops.map((h) => [h.n, h.host, h.km])).toEqual([
      [1, 'lisbon.pt', 2348],
      [2, 'tokyo.jp', 9094],
    ]);
  });
});

describe('countryCount', () => {
  it('counts each country once', () => {
    const tokyo = { name: 'Tokyo', lat: 35.7, lng: 139.7 };
    expect(
      countryCount([trip('a', '2024-01', 'JP', tokyo), trip('b', '2025-01', 'JP', tokyo), trip('c', '2025-02', 'PT', tokyo)]),
    ).toBe(2);
  });
});
