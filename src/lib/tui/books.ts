import type { Book } from '@/lib/content/collections';

export interface BookGroups {
  running: Book[];
  finishedByYear: [string, Book[]][];
  queued: Book[];
}

export function groupBooks(books: Book[]): BookGroups {
  const running = books
    .filter((b) => b.status === 'reading' || b.status === 'paused')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'reading' ? -1 : 1;
      return (b.progress ?? 0) - (a.progress ?? 0);
    });

  const byYear = new Map<string, Book[]>();
  const finished = books
    .filter((b) => b.status === 'finished')
    .sort((a, b) => (b.finished ?? '').localeCompare(a.finished ?? ''));
  for (const b of finished) {
    const year = (b.finished ?? '').slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), b]);
  }
  const finishedByYear = [...byYear.entries()].sort(([a], [b]) => b.localeCompare(a));

  const queued = books.filter((b) => b.status === 'queued').sort((a, b) => a.title.localeCompare(b.title));

  return { running, finishedByYear, queued };
}

export function relatedBooks(book: Book, all: Book[], limit = 5): Book[] {
  return all.filter((b) => b.slug !== book.slug && b.tags.some((t) => book.tags.includes(t))).slice(0, limit);
}
