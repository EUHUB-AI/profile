import { sparkHeights } from '@/lib/tui/sport';

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const heights = sparkHeights(values, 8);
  return (
    <svg className="spark" viewBox={`0 0 ${values.length * 3} 8`} preserveAspectRatio="none" role="img" aria-label={label}>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 3}
          y={8 - Math.max(h, 0.5)}
          width={2}
          height={Math.max(h, 0.5)}
          fill="currentColor"
          opacity={h === 0 ? 0.3 : 1}
        />
      ))}
    </svg>
  );
}
