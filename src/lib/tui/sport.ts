export function sparkHeights(values: number[], levels = 8): number[] {
  const max = Math.max(0, ...values);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (v <= 0 ? 0 : Math.max(1, Math.round((v / max) * levels))));
}

export interface SportStats {
  last: number;
  avg: number;
  peak: number;
  weeks: number;
}

export function sportStats(weekly: number[]): SportStats {
  const total = weekly.reduce((sum, v) => sum + v, 0);
  return {
    last: weekly[weekly.length - 1] ?? 0,
    avg: Math.round((total / Math.max(1, weekly.length)) * 10) / 10,
    peak: Math.max(0, ...weekly),
    weeks: weekly.length,
  };
}
