export function filledCells(percent: number, cells = 10): number {
  const p = Math.min(100, Math.max(0, percent));
  if (p === 0) return 0;
  return Math.max(1, Math.round((p / 100) * cells));
}
