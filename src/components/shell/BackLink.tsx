import Link from 'next/link';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="mt-14">
      <Link href={href} className="link">
        <span aria-hidden="true" className="text-dim">
          $ cd ..{' '}
        </span>
        {label}
      </Link>
    </p>
  );
}
