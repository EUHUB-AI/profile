'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toggleTheme } from '@/lib/theme';
import { nextIndex, resolveKey } from '@/lib/tui/keys';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function KeyboardNav() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const openHelp = () => dialog?.showModal();

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const action = resolveKey({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isEditable: isEditable(event.target),
      });
      if (!action) return;

      if (dialog?.open) {
        if (action.type === 'help') {
          event.preventDefault();
          dialog.close();
        }
        return;
      }

      event.preventDefault();
      if (action.type === 'goto') {
        router.push(action.href);
      } else if (action.type === 'toggleTheme') {
        toggleTheme();
      } else if (action.type === 'help') {
        openHelp();
      } else {
        const items = Array.from(document.querySelectorAll<HTMLElement>('main [data-nav-item]'));
        const index = nextIndex(items.indexOf(document.activeElement as HTMLElement), items.length, action.delta);
        if (index >= 0) {
          items[index].focus();
          items[index].scrollIntoView({ block: 'nearest' });
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('tui:help', openHelp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('tui:help', openHelp);
    };
  }, [router]);

  return (
    <dialog ref={dialogRef} className="help" aria-labelledby="help-title">
      <h2 id="help-title" className="t-title mb-4">
        Keyboard shortcuts
      </h2>
      <dl className="grid grid-cols-[10ch_minmax(0,1fr)] gap-y-1">
        <dt><kbd>1</kbd>-<kbd>6</kbd></dt>
        <dd>switch section</dd>
        <dt><kbd>j</kbd> <kbd>k</kbd></dt>
        <dd>next / previous item</dd>
        <dt><kbd>enter</kbd></dt>
        <dd>open item</dd>
        <dt><kbd>t</kbd></dt>
        <dd>switch theme (crt / printout)</dd>
        <dt><kbd>?</kbd></dt>
        <dd>show this help</dd>
        <dt><kbd>esc</kbd></dt>
        <dd>close</dd>
      </dl>
      <form method="dialog" className="mt-6">
        <button type="submit" className="link cursor-pointer">
          Close
        </button>
      </form>
    </dialog>
  );
}
