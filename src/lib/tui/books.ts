import type { Book } from '@/lib/content/collections';
import { BOOK_LANGUAGE_NAMES } from '@/lib/content/schemas';

export interface BookGroups {
  running: Book[];
  finishedByYear: [string, Book[]][];
  finishedEarlier: Book[];
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
  const finished = books.filter((b) => b.status === 'finished');
  const dated = finished.filter((b) => b.finished).sort((a, b) => (b.finished ?? '').localeCompare(a.finished ?? ''));
  for (const b of dated) {
    const year = (b.finished ?? '').slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), b]);
  }
  const finishedEarlier = finished.filter((b) => !b.finished).sort((a, b) => a.title.localeCompare(b.title));
  const finishedByYear = [...byYear.entries()].sort(([a], [b]) => b.localeCompare(a));

  const queued = books.filter((b) => b.status === 'queued').sort((a, b) => a.title.localeCompare(b.title));

  return { running, finishedByYear, finishedEarlier, queued };
}

export function languageNames(book: Book): string {
  return book.languages.map((l) => BOOK_LANGUAGE_NAMES[l]).join(', ');
}

export function relatedBooks(book: Book, all: Book[], limit = 5): Book[] {
  return all.filter((b) => b.slug !== book.slug && b.tags.some((t) => book.tags.includes(t))).slice(0, limit);
}
