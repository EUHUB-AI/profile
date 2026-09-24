import { describe, expect, it } from 'vitest';
import type { Book } from '@/lib/content/collections';
import { groupBooks, relatedBooks } from './books';

function book(slug: string, fields: Partial<Book> & Pick<Book, 'status'>): Book {
  return { slug, title: slug, author: 'A', tags: [], sample: false, body: '', ...fields };
}

describe('groupBooks', () => {
  it('lists reading before paused, each by progress descending', () => {
    const groups = groupBooks([
      book('p', { status: 'paused', progress: 90 }),
      book('r1', { status: 'reading', progress: 10 }),
      book('r2', { status: 'reading', progress: 70 }),
    ]);
    expect(groups.running.map((b) => b.slug)).toEqual(['r2', 'r1', 'p']);
  });

  it('groups finished books by year, newest year and newest book first', () => {
    const groups = groupBooks([
      book('old', { status: 'finished', finished: '2025-02' }),
      book('new', { status: 'finished', finished: '2026-03' }),
      book('newer', { status: 'finished', finished: '2026-07' }),
    ]);
    expect(groups.finishedByYear.map(([year, list]) => [year, list.map((b) => b.slug)])).toEqual([
      ['2026', ['newer', 'new']],
      ['2025', ['old']],
    ]);
  });

  it('sorts queued books by title', () => {
    const groups = groupBooks([
      book('z', { status: 'queued', title: 'Zen' }),
      book('a', { status: 'queued', title: 'Art' }),
    ]);
    expect(groups.queued.map((b) => b.slug)).toEqual(['a', 'z']);
  });

  it('returns empty groups when there are no books', () => {
    expect(groupBooks([])).toEqual({ running: [], finishedByYear: [], queued: [] });
  });
});

describe('relatedBooks', () => {
  const sre = book('sre', { status: 'finished', finished: '2026-03', tags: ['sre', 'operations'] });
  const phoenix = book('phoenix', { status: 'finished', finished: '2025-11', tags: ['operations'] });
  const habits = book('habits', { status: 'reading', progress: 30, tags: ['habits'] });

  it('returns other books that share a tag', () => {
    expect(relatedBooks(sre, [sre, phoenix, habits]).map((b) => b.slug)).toEqual(['phoenix']);
  });

  it('returns nothing for a book without tags', () => {
    expect(relatedBooks(book('x', { status: 'queued' }), [sre, phoenix, habits])).toEqual([]);
  });
});
