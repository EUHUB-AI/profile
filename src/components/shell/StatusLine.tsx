'use client';

import { ThemeToggle } from './ThemeToggle';

export function StatusLine({ uptime }: { uptime?: string }) {
  return (
    <footer className="shell-status t-dense">
      <div className="ml-auto flex gap-[2ch]">
        <ThemeToggle />
        {uptime && <span className="text-dim">up {uptime}</span>}
      </div>
    </footer>
  );
}
