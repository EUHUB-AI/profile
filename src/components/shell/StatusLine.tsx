'use client';

import { ThemeToggle } from './ThemeToggle';

export function StatusLine({ uptime }: { uptime?: string }) {
  return (
    <footer className="shell-status t-dense">
      <p className="hidden gap-[2ch] text-dim sm:flex">
        <button type="button" className="hint" onClick={() => window.dispatchEvent(new Event('tui:help'))}>
          <kbd>?</kbd> keys
        </button>
        <span>
          <kbd>1-6</kbd> tabs
        </span>
        <span>
          <kbd>j/k</kbd> move
        </span>
        <span>
          <kbd>t</kbd> theme
        </span>
      </p>
      <div className="ml-auto flex gap-[2ch]">
        <ThemeToggle />
        {uptime && <span className="text-dim">up {uptime}</span>}
      </div>
    </footer>
  );
}
