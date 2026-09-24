import type { z } from 'zod';
import { type Entry, loadCollection, loadSingle } from './load';
import {
  bookSchema,
  careerSchema,
  hobbySchema,
  languageSchema,
  profileSchema,
  sportSchema,
  tripSchema,
} from './schemas';

export type Profile = Entry<z.output<typeof profileSchema>>;
export type Job = Entry<z.output<typeof careerSchema>>;
export type Book = Entry<z.output<typeof bookSchema>>;
export type Trip = Entry<z.output<typeof tripSchema>>;
export type Language = Entry<z.output<typeof languageSchema>>;
export type Sport = Entry<z.output<typeof sportSchema>>;
export type Hobby = Entry<z.output<typeof hobbySchema>>;

export const getProfile = (): Profile => loadSingle('profile.md', profileSchema);
export const getCareer = (): Job[] => loadCollection('career', careerSchema);
export const getBooks = (): Book[] => loadCollection('books', bookSchema);
export const getTrips = (): Trip[] => loadCollection('travel', tripSchema);
export const getLanguages = (): Language[] => loadCollection('languages', languageSchema);
export const getSports = (): Sport[] => loadCollection('sport', sportSchema);
export const getHobbies = (): Hobby[] => loadCollection('hobbies', hobbySchema);

export const getBook = (slug: string) => getBooks().find((b) => b.slug === slug);
export const getTrip = (slug: string) => getTrips().find((t) => t.slug === slug);
export const getLanguage = (slug: string) => getLanguages().find((l) => l.slug === slug);
export const getSport = (slug: string) => getSports().find((s) => s.slug === slug);
export const getHobby = (slug: string) => getHobbies().find((h) => h.slug === slug);
