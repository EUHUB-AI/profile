import { TABS } from '@/lib/tui/tabs';
import { getBooks, getHobbies, getLanguages, getSports, getTrips } from './collections';

export function contentPaths(): string[] {
  return [
    ...TABS.map((t) => t.href),
    ...getBooks().map((b) => `/books/${b.slug}`),
    ...getTrips().map((t) => `/travel/${t.slug}`),
    ...getLanguages().map((l) => `/languages/${l.slug}`),
    ...getSports().map((s) => `/sport/${s.slug}`),
    ...getHobbies().map((h) => `/hobbies/${h.slug}`),
  ];
}
