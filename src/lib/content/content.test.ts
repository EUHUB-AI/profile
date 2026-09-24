import { describe, expect, it } from 'vitest';
import { getBooks, getCareer, getHobbies, getLanguages, getProfile, getSports, getTrips } from './collections';

describe('content/ folder', () => {
  it('has a valid profile', () => {
    expect(getProfile().name).toBeTruthy();
  });

  it.each([
    ['career', getCareer],
    ['books', getBooks],
    ['travel', getTrips],
    ['languages', getLanguages],
    ['sport', getSports],
    ['hobbies', getHobbies],
  ] as const)('%s entries all pass validation', (_name, load) => {
    expect(load().length).toBeGreaterThan(0);
  });
});
