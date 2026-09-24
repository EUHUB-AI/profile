import { describe, expect, it } from 'vitest';
import { nextIndex, resolveKey } from './keys';

const plain = { altKey: false, ctrlKey: false, metaKey: false, isEditable: false };

describe('resolveKey', () => {
  it('maps digits to section tabs', () => {
    expect(resolveKey({ ...plain, key: '1' })).toEqual({ type: 'goto', href: '/' });
    expect(resolveKey({ ...plain, key: '2' })).toEqual({ type: 'goto', href: '/books' });
    expect(resolveKey({ ...plain, key: '6' })).toEqual({ type: 'goto', href: '/hobbies' });
  });

  it('maps j, k, t and ?', () => {
    expect(resolveKey({ ...plain, key: 'j' })).toEqual({ type: 'move', delta: 1 });
    expect(resolveKey({ ...plain, key: 'k' })).toEqual({ type: 'move', delta: -1 });
    expect(resolveKey({ ...plain, key: 't' })).toEqual({ type: 'toggleTheme' });
    expect(resolveKey({ ...plain, key: '?' })).toEqual({ type: 'help' });
  });

  it('leaves browser shortcuts alone when Ctrl, Cmd or Alt is held', () => {
    expect(resolveKey({ ...plain, key: '1', ctrlKey: true })).toBeNull();
    expect(resolveKey({ ...plain, key: '1', metaKey: true })).toBeNull();
    expect(resolveKey({ ...plain, key: 't', altKey: true })).toBeNull();
  });

  it('ignores keys typed into editable fields', () => {
    expect(resolveKey({ ...plain, key: 'j', isEditable: true })).toBeNull();
  });

  it('ignores unmapped and uppercase keys', () => {
    expect(resolveKey({ ...plain, key: 'x' })).toBeNull();
    expect(resolveKey({ ...plain, key: 'J' })).toBeNull();
    expect(resolveKey({ ...plain, key: '7' })).toBeNull();
  });
});

describe('nextIndex', () => {
  it('starts at the first item going down and the last going up', () => {
    expect(nextIndex(-1, 5, 1)).toBe(0);
    expect(nextIndex(-1, 5, -1)).toBe(4);
  });

  it('moves one step and stops at the ends', () => {
    expect(nextIndex(2, 5, 1)).toBe(3);
    expect(nextIndex(4, 5, 1)).toBe(4);
    expect(nextIndex(0, 5, -1)).toBe(0);
  });

  it('returns -1 when there is nothing to focus', () => {
    expect(nextIndex(-1, 0, 1)).toBe(-1);
  });
});
