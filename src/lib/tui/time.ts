export function ymKey(value: string): number {
  const [year, month] = value.split('-');
  return Number(year) * 12 + (month ? Number(month) - 1 : 0);
}

export function durationSince(start: string, at: Date): string {
  const months = Math.max(0, at.getUTCFullYear() * 12 + at.getUTCMonth() - ymKey(start));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years > 0 ? `${years}y ${rest}m` : `${rest}m`;
}

export function now(): Date {
  return new Date();
}
