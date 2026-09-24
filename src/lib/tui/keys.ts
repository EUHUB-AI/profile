import { TABS } from './tabs';

export type KeyAction =
  | { type: 'goto'; href: string }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'toggleTheme' }
  | { type: 'help' };

export interface KeyInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  isEditable: boolean;
}

export function resolveKey(input: KeyInput): KeyAction | null {
  if (input.altKey || input.ctrlKey || input.metaKey || input.isEditable) return null;
  const tab = TABS.find((t) => t.key === input.key);
  if (tab) return { type: 'goto', href: tab.href };
  switch (input.key) {
    case 'j':
      return { type: 'move', delta: 1 };
    case 'k':
      return { type: 'move', delta: -1 };
    case 't':
      return { type: 'toggleTheme' };
    case '?':
      return { type: 'help' };
    default:
      return null;
  }
}

export function nextIndex(current: number, count: number, delta: 1 | -1): number {
  if (count === 0) return -1;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  return Math.min(count - 1, Math.max(0, current + delta));
}
