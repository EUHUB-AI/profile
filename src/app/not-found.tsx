import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <>
      <h1 className="sr-only">Page not found</h1>
      <p aria-hidden="true" className="t-title text-alert">
        bash: cd: no such file or directory
      </p>
      <p className="mt-4 max-w-[60ch]">
        This page doesn&apos;t exist. Pick a section from the tabs, or go to the{' '}
        <Link href="/" className="link">
          home page
        </Link>
        .
      </p>
    </>
  );
}
