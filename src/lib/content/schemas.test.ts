import { describe, expect, it } from 'vitest';
import { bookSchema, day, languageSchema, yearMonth } from './schemas';

describe('date fields', () => {
  it('accepts YYYY and YYYY-MM strings', () => {
    expect(yearMonth.parse('2019')).toBe('2019');
    expect(yearMonth.parse('2025-04')).toBe('2025-04');
  });

  it('normalizes unquoted YAML dates and bare years instead of failing', () => {
    expect(yearMonth.parse(new Date('2025-04-12T00:00:00Z'))).toBe('2025-04');
    expect(yearMonth.parse(2019)).toBe('2019');
    expect(day.parse(new Date('2027-04-18T00:00:00Z'))).toBe('2027-04-18');
  });

  it('rejects other formats with a hint about the expected format', () => {
    const result = yearMonth.safeParse('April 2025');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/YYYY-MM/);
  });
});

describe('bookSchema', () => {
  const base = { title: 'T', author: 'A' };

  it('requires progress for books being read', () => {
    const result = bookSchema.safeParse({ ...base, status: 'reading' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['progress']);
  });

  it('requires a finished date for finished books', () => {
    const result = bookSchema.safeParse({ ...base, status: 'finished' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['finished']);
  });

  it('rejects progress above 100', () => {
    expect(bookSchema.safeParse({ ...base, status: 'reading', progress: 120 }).success).toBe(false);
  });

  it('defaults tags and sample', () => {
    expect(bookSchema.parse({ ...base, status: 'queued' })).toMatchObject({ tags: [], sample: false });
  });
});

describe('languageSchema', () => {
  it('rejects a target below the current level', () => {
    const result = languageSchema.safeParse({ name: 'German', level: 'B2', target: 'A1', since: '2024-01' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['target']);
  });
});
