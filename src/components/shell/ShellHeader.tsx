'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS, activeTabHref, promptPath } from '@/lib/tui/tabs';

export function ShellHeader({ user, host }: { user: string; host: string }) {
  const pathname = usePathname();
  const active = activeTabHref(pathname);
  return (
    <>
      <div className="shell-title t-dense">
        {user}@{host}: {promptPath(pathname)}
      </div>
      <nav aria-label="Sections" className="shell-tabs">
        <ul>
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link href={tab.href} className="tab" aria-current={active === tab.href ? 'page' : undefined}>
                <span className="tab-key text-dim">{tab.key}</span> {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
