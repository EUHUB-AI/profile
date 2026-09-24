import type { Metadata } from 'next';
import { HtopList } from '@/components/books/HtopList';
import { Prompt } from '@/components/shell/Prompt';
import { getBooks } from '@/lib/content/collections';

export const metadata: Metadata = {
  title: 'Books',
  description: 'Books in progress, finished and queued.',
};

export default function BooksPage() {
  const books = getBooks();
  return (
    <>
      <Prompt cmd="htop -u books" label="Books" />
      {books.length === 0 ? <p className="text-dim">No books logged yet.</p> : <HtopList books={books} />}
    </>
  );
}
