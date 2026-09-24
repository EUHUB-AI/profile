import type { Book, Hobby, Language, Sport, Trip } from '@/lib/content/collections';
import { countryCount, hostName } from './travel';

export interface MotdSummary {
  reading: number;
  nowReading?: { title: string; progress: number; slug: string };
  countries: number;
  lastTrip?: { host: string; start: string; slug: string };
  languagesRunning: number;
  languagesTotal: number;
  streak?: { sport: string; days: number };
  hobbiesActive: number;
  hobbiesTotal: number;
}

export function summarize(input: {
  books: Book[];
  trips: Trip[];
  languages: Language[];
  sports: Sport[];
  hobbies: Hobby[];
}): MotdSummary {
  const reading = input.books.filter((b) => b.status === 'reading');
  const current = [...reading].sort((a, b) => (b.started ?? '').localeCompare(a.started ?? ''))[0];
  const lastTrip = [...input.trips].sort((a, b) => b.start.localeCompare(a.start))[0];
  const streakSport = input.sports
    .filter((s) => s.active && s.streakDays !== undefined)
    .sort((a, b) => (b.streakDays ?? 0) - (a.streakDays ?? 0))[0];

  return {
    reading: reading.length,
    nowReading: current ? { title: current.title, progress: current.progress ?? 0, slug: current.slug } : undefined,
    countries: countryCount(input.trips),
    lastTrip: lastTrip
      ? { host: hostName(lastTrip.cities[0].name, lastTrip.countryCode), start: lastTrip.start, slug: lastTrip.slug }
      : undefined,
    languagesRunning: input.languages.filter((l) => l.level !== l.target).length,
    languagesTotal: input.languages.length,
    streak: streakSport ? { sport: streakSport.name, days: streakSport.streakDays ?? 0 } : undefined,
    hobbiesActive: input.hobbies.filter((h) => h.state === 'active').length,
    hobbiesTotal: input.hobbies.length,
  };
}
