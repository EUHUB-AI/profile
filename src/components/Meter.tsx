import { filledCells } from '@/lib/tui/meter';

export function Meter({ percent, cells = 10 }: { percent: number; cells?: number }) {
  const on = filledCells(percent, cells);
  return (
    <span className="meter" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} data-on={i < on ? '' : undefined} />
      ))}
    </span>
  );
}
