'use client';

import { useSyncExternalStore } from 'react';
import { type Theme, currentTheme, toggleTheme } from '@/lib/theme';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  const label = theme === null ? '…' : theme === 'dark' ? 'crt' : 'printout';
  return (
    <button type="button" onClick={toggleTheme} className="cursor-pointer hover:text-warn">
      theme: {label}
    </button>
  );
}
