import type { Metadata } from 'next';
import Link from 'next/link';
import { Prompt } from '@/components/shell/Prompt';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <>
      <Prompt cmd="cd ~/missing-page" label="Page not found" />
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
