import Link from 'next/link';
import { Meter } from '@/components/Meter';
import { SampleTag } from '@/components/SampleTag';
import type { Book } from '@/lib/content/collections';
import { groupBooks, languageNames } from '@/lib/tui/books';

function BookTitle({ book }: { book: Book }) {
  return (
    <span>
      {book.title}
      {book.titleIsTranslation && <span className="text-dim"> (translated)</span>}
      <SampleTag show={book.sample} />
      {book.readTitle && book.readTitle !== book.title && <span className="block text-dim">{book.readTitle}</span>}
    </span>
  );
}

function FinishedRows({ books }: { books: Book[] }) {
  return (
    <ul className="rows">
      {books.map((b) => (
        <li key={b.slug}>
          <Link
            href={`/books/${b.slug}`}
            data-nav-item
            className="row grid-cols-[8ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[8ch_4ch_minmax(0,1fr)_22ch_10ch]"
          >
            <span className="text-dim">{b.finished}</span>
            <span className="text-dim">
              {b.rating && (
                <>
                  <span aria-hidden="true">{b.rating}/5</span>
                  <span className="sr-only">rated {b.rating} out of 5</span>
                </>
              )}
            </span>
            <span className="col-start-2 sm:col-start-auto">
              <BookTitle book={b} />
            </span>
            <span className="col-start-2 text-dim sm:col-start-auto">{b.author}</span>
            <span className="col-start-2 text-dim sm:col-start-auto">{languageNames(b)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HtopList({ books }: { books: Book[] }) {
  const { running, finishedByYear, finishedEarlier, queued } = groupBooks(books);
  const reading = running.filter((b) => b.status === 'reading').length;

  return (
    <div className="space-y-12">
      <p className="text-dim">
        Tasks: {books.length} total, {reading} running, {running.length - reading} sleeping, {queued.length} queued
      </p>

      {running.length > 0 && (
        <section aria-labelledby="books-running">
          <h2 id="books-running" className="t-title mb-3">
            in progress
          </h2>
          <ul className="rows">
            {running.map((b) => {
              const tone = b.status === 'reading' ? 'text-warn' : 'text-dim';
              return (
                <li key={b.slug}>
                  <Link
                    href={`/books/${b.slug}`}
                    data-nav-item
                    className="row grid-cols-[2ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[2ch_18ch_minmax(0,1fr)_22ch_10ch]"
                  >
                    <span className={tone}>
                      <span aria-hidden="true">{b.status === 'reading' ? 'R' : 'S'}</span>
                      <span className="sr-only">{b.status}</span>
                    </span>
                    <span className={`${tone} whitespace-nowrap`}>
                      <Meter percent={b.progress ?? 0} />{' '}
                      <span className="inline-block w-[4ch] text-right">{b.progress ?? 0}%</span>
                    </span>
                    <span className="col-start-2 sm:col-start-auto">
                      <BookTitle book={b} />
                    </span>
                    <span className="col-start-2 text-dim sm:col-start-auto">{b.author}</span>
                    <span className="col-start-2 text-dim sm:col-start-auto">{languageNames(b)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {finishedByYear.map(([year, list]) => (
        <section key={year} aria-labelledby={`books-${year}`}>
          <h2 id={`books-${year}`} className="t-title mb-3">
            finished in {year}
          </h2>
          <FinishedRows books={list} />
        </section>
      ))}

      {finishedEarlier.length > 0 && (
        <section aria-labelledby="books-earlier">
          <h2 id="books-earlier" className="t-title mb-3">
            finished earlier
          </h2>
          <FinishedRows books={finishedEarlier} />
        </section>
      )}

      {queued.length > 0 && (
        <section aria-labelledby="books-queued">
          <h2 id="books-queued" className="t-title mb-3">
            queued
          </h2>
          <ul className="rows">
            {queued.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/books/${b.slug}`}
                  data-nav-item
                  className="row grid-cols-[minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[minmax(0,1fr)_22ch_10ch]"
                >
                  <BookTitle book={b} />
                  <span className="text-dim">{b.author}</span>
                  <span className="text-dim">{languageNames(b)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
