import { describe, expect, it } from 'vitest';
import { getBooks, getHobbies } from './collections';
import { contentPaths } from './routes';

describe('contentPaths', () => {
  const paths = contentPaths();

  it('includes every section and every detail page', () => {
    expect(paths).toContain('/');
    expect(paths).toContain('/travel');
    for (const b of getBooks()) expect(paths).toContain(`/books/${b.slug}`);
    for (const h of getHobbies()) expect(paths).toContain(`/hobbies/${h.slug}`);
  });

  it('has no duplicates', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });
});
