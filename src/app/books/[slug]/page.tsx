import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ManPage } from '@/components/books/ManPage';
import { BackLink } from '@/components/shell/BackLink';
import { getBook, getBooks, getProfile } from '@/lib/content/collections';
import { relatedBooks } from '@/lib/tui/books';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const book = getBook((await params).slug);
  return book ? { title: book.title, description: `${book.title} by ${book.author}` } : {};
}

export default async function BookPage({ params }: Params) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();
  return (
    <>
      <ManPage book={book} related={relatedBooks(book, getBooks())} host={getProfile().host} />
      <BackLink href="/books" label="Back to books" />
    </>
  );
}
