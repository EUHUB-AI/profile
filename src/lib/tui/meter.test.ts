import { describe, expect, it } from 'vitest';
import { filledCells } from './meter';

describe('filledCells', () => {
  it('rounds to the nearest cell', () => {
    expect(filledCells(68)).toBe(7);
  });

  it('is empty at 0 and full at 100', () => {
    expect(filledCells(0)).toBe(0);
    expect(filledCells(100)).toBe(10);
  });

  it('shows at least one cell for any progress', () => {
    expect(filledCells(4)).toBe(1);
  });

  it('clamps out-of-range values', () => {
    expect(filledCells(150)).toBe(10);
    expect(filledCells(-5)).toBe(0);
  });

  it('supports other widths', () => {
    expect(filledCells(50, 20)).toBe(10);
  });
});
