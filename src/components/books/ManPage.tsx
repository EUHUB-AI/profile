import Link from 'next/link';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import type { Book } from '@/lib/content/collections';

export function ManPage({ book, related }: { book: Book; related: Book[] }) {
  const name = `${book.slug.toUpperCase()}(7)`;
  const synopsis: [string, string][] = [['status', book.status]];
  if (book.progress !== undefined && book.status !== 'finished') synopsis.push(['progress', `${book.progress}%`]);
  if (book.started) synopsis.push(['started', book.started]);
  if (book.finished) synopsis.push(['finished', book.finished]);
  if (book.rating) synopsis.push(['rating', `${book.rating}/5`]);
  if (book.published) synopsis.push(['published', String(book.published)]);
  if (book.tags.length > 0) synopsis.push(['tags', book.tags.join(', ')]);

  return (
    <article className="man">
      <h1 className="sr-only">{book.title}</h1>
      <header aria-hidden="true" className="t-dense mb-8 flex justify-between gap-[2ch] text-dim">
        <span className="truncate">{name}</span>
        <span className="hidden sm:inline">Reading Manual</span>
        <span className="hidden truncate sm:inline">{name}</span>
      </header>

      <section>
        <h2 className="man-h">NAME</h2>
        <p className="man-indent">
          {book.title} - {book.author}
          <SampleTag show={book.sample} />
        </p>
      </section>

      <section>
        <h2 className="man-h">SYNOPSIS</h2>
        <dl className="man-indent grid grid-cols-[11ch_minmax(0,1fr)] gap-x-[2ch]">
          {synopsis.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-dim">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {book.body && (
        <section>
          <h2 className="man-h">NOTES</h2>
          <div className="man-indent">
            <Markdown source={book.body} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="man-h">SEE ALSO</h2>
          <p className="man-indent flex flex-wrap gap-x-[2ch]">
            {related.map((r) => (
              <span key={r.slug}>
                <Link href={`/books/${r.slug}`} data-nav-item className="link">
                  {r.slug}(7)
                </Link>
                <SampleTag show={r.sample} />
              </span>
            ))}
          </p>
        </section>
      )}

      <footer aria-hidden="true" className="t-dense mt-12 flex justify-between gap-[2ch] text-dim">
        <span>mike-g</span>
        <span>{book.finished ?? book.started ?? ''}</span>
        <span className="hidden truncate sm:inline">{name}</span>
      </footer>
    </article>
  );
}
