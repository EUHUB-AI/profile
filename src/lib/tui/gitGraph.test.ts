import { describe, expect, it } from 'vitest';
import { layoutGraph, shortHash } from './gitGraph';

const render = (rows: ReturnType<typeof layoutGraph<{ slug: string; start: string; end?: string }>>) =>
  rows.map((r) => (r.kind === 'commit' ? `${r.prefix.trimEnd()} ${r.entry.slug}` : r.prefix.trimEnd()));

describe('layoutGraph', () => {
  it('draws overlapping jobs as parallel lanes that merge back', () => {
    const jobs = [
      { slug: 'geniusee', start: '2022-05', end: '2023-10' },
      { slug: 'imonomy', start: '2019', end: '2020-03' },
      { slug: 'pajak', start: '2023-12', end: '2024-12' },
      { slug: 'avys', start: '2020-03', end: '2021-03' },
      { slug: 'ux', start: '2023-12' },
      { slug: 'netforce', start: '2021-03', end: '2022-04' },
    ];
    expect(render(layoutGraph(jobs))).toEqual([
      '* | ux',
      '| * pajak',
      '|/',
      '* geniusee',
      '* netforce',
      '* avys',
      '* imonomy',
    ]);
  });

  it('keeps a single straight line when nothing overlaps', () => {
    expect(render(layoutGraph([{ slug: 'a', start: '2020-01', end: '2021-01' }]))).toEqual(['* a']);
  });

  it('returns no rows for no entries', () => {
    expect(layoutGraph([])).toEqual([]);
  });
});

describe('shortHash', () => {
  it('returns a stable 7-character hex hash', () => {
    expect(shortHash('ux')).toMatch(/^[0-9a-f]{7}$/);
    expect(shortHash('ux')).toBe(shortHash('ux'));
    expect(shortHash('ux')).not.toBe(shortHash('pajak'));
  });
});
