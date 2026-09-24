import type { ReactNode } from 'react';
import type { Profile } from '@/lib/content/collections';
import { KeyboardNav } from './KeyboardNav';
import { ShellHeader } from './ShellHeader';
import { StatusLine } from './StatusLine';

export function TuiFrame({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <div className="frame">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ShellHeader user={profile.handle} host={profile.host} />
      <main id="main" className="shell-main">
        {children}
      </main>
      <StatusLine uptime={profile.uptime} />
      <KeyboardNav />
    </div>
  );
}
