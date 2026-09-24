'use client';

import { useEffect } from 'react';

export function MotdPlayback() {
  useEffect(() => {
    const root = document.documentElement;
    if (!('motdPlay' in root.dataset)) return;
    const lines = document.querySelectorAll('.motd-line');

    function stop() {
      delete root.dataset.motdPlay;
      cleanup();
    }
    function cleanup() {
      window.removeEventListener('keydown', stop);
      window.removeEventListener('pointerdown', stop);
      clearTimeout(timer);
    }

    const timer = setTimeout(stop, lines.length * 70 + 100);
    window.addEventListener('keydown', stop);
    window.addEventListener('pointerdown', stop);
    return cleanup;
  }, []);

  return null;
}
