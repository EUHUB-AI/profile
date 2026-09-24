import { describe, expect, it } from 'vitest';
import type { Book, Hobby, Language, Sport, Trip } from '@/lib/content/collections';
import { summarize } from './motd';

describe('summarize', () => {
  it('summarizes every section', () => {
    const books: Book[] = [
      { slug: 'a', title: 'A', author: 'x', status: 'reading', progress: 40, started: '2026-01', tags: [], sample: false, body: '' },
      { slug: 'b', title: 'B', author: 'x', status: 'reading', progress: 10, started: '2026-08', tags: [], sample: false, body: '' },
      { slug: 'c', title: 'C', author: 'x', status: 'finished', finished: '2025-01', tags: [], sample: false, body: '' },
    ];
    const trips: Trip[] = [
      { slug: 't1', title: 'T1', country: 'Japan', countryCode: 'JP', start: '2025-04', cities: [{ name: 'Tokyo', lat: 35.7, lng: 139.7 }], sample: false, body: '' },
      { slug: 't2', title: 'T2', country: 'Iceland', countryCode: 'IS', start: '2026-06', cities: [{ name: 'Reykjavík', lat: 64.1, lng: -21.9 }], sample: false, body: '' },
    ];
    const languages: Language[] = [
      { slug: 'de', name: 'German', level: 'B1', target: 'B2', since: '2024-01', methods: [], sample: false, body: '' },
      { slug: 'en', name: 'English', level: 'C1', target: 'C1', since: '2010', methods: [], sample: false, body: '' },
    ];
    const sports: Sport[] = [
      { slug: 'run', name: 'Running', unit: 'km', weekly: [1, 2], records: [], events: [], streakDays: 41, active: true, sample: false, body: '' },
      { slug: 'climb', name: 'Climbing', unit: 'sessions', weekly: [1, 2], records: [], events: [], streakDays: 90, active: false, sample: false, body: '' },
    ];
    const hobbies: Hobby[] = [
      { slug: 'chess', name: 'Chess', description: 'd', state: 'inactive', since: '2022-03', sample: false, body: '' },
      { slug: 'photo', name: 'Photography', description: 'd', state: 'active', since: '2019-06', sample: false, body: '' },
    ];

    expect(summarize({ books, trips, languages, sports, hobbies })).toEqual({
      reading: 2,
      nowReading: { title: 'B', progress: 10, slug: 'b' },
      countries: 2,
      lastTrip: { host: 'reykjavik.is', start: '2026-06', slug: 't2' },
      languagesRunning: 1,
      languagesTotal: 2,
      streak: { sport: 'Running', days: 41 },
      hobbiesActive: 1,
      hobbiesTotal: 2,
    });
  });

  it('handles empty sections without inventing values', () => {
    expect(summarize({ books: [], trips: [], languages: [], sports: [], hobbies: [] })).toEqual({
      reading: 0,
      nowReading: undefined,
      countries: 0,
      lastTrip: undefined,
      languagesRunning: 0,
      languagesTotal: 0,
      streak: undefined,
      hobbiesActive: 0,
      hobbiesTotal: 0,
    });
  });
});
