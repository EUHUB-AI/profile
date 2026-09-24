import { describe, expect, it } from 'vitest';
import { sparkHeights, sportStats } from './sport';

describe('sparkHeights', () => {
  it('scales values to the tallest bar', () => {
    expect(sparkHeights([0, 5, 10], 8)).toEqual([0, 4, 8]);
  });

  it('keeps small non-zero weeks visible', () => {
    expect(sparkHeights([1, 100], 8)).toEqual([1, 8]);
  });

  it('returns zeros when nothing was logged', () => {
    expect(sparkHeights([0, 0], 8)).toEqual([0, 0]);
  });
});

describe('sportStats', () => {
  it('reports the last week, the average and the peak', () => {
    expect(sportStats([10, 20, 30, 0])).toEqual({ last: 0, avg: 15, peak: 30, weeks: 4 });
  });

  it('rounds the average to one decimal', () => {
    expect(sportStats([1, 2, 2]).avg).toBe(1.7);
  });
});
