'use client';

import { useEffect } from 'react';

export function MotdPlayback() {
  useEffect(() => {
    const root = document.documentElement;
    if (!('motdPlay' in root.dataset)) return;
    const lines = document.querySelectorAll('.motd-line');
    const last = lines[lines.length - 1];

    function stop() {
      delete root.dataset.motdPlay;
      cleanup();
    }
    function cleanup() {
      window.removeEventListener('keydown', stop);
      window.removeEventListener('pointerdown', stop);
      last?.removeEventListener('animationend', stop);
    }

    window.addEventListener('keydown', stop);
    window.addEventListener('pointerdown', stop);
    last?.addEventListener('animationend', stop);
    return cleanup;
  }, []);

  return null;
}
