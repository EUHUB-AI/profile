import { describe, expect, it } from 'vitest';
import { durationSince, ymKey } from './time';

describe('ymKey', () => {
  it('orders year-months', () => {
    expect(ymKey('2020-03')).toBeGreaterThan(ymKey('2020-02'));
    expect(ymKey('2021-01')).toBeGreaterThan(ymKey('2020-12'));
  });

  it('treats a bare year as January', () => {
    expect(ymKey('2019')).toBe(ymKey('2019-01'));
  });
});

describe('durationSince', () => {
  const at = new Date('2026-09-24T12:00:00Z');

  it('formats years and months', () => {
    expect(durationSince('2019-06', at)).toBe('7y 3m');
  });

  it('formats months only under a year', () => {
    expect(durationSince('2026-04', at)).toBe('5m');
  });

  it('never goes negative for future dates', () => {
    expect(durationSince('2027-01', at)).toBe('0m');
  });
});
