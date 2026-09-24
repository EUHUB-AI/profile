import type { Coord } from '@/lib/tui/travel';
import { HOME_PIN, buildTravelMap } from '@/lib/tui/travelMap';

export function WorldMap({ places, home }: { places: (Coord & { slug: string })[]; home: Coord }) {
  const model = buildTravelMap(places, home);
  return (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      role="img"
      aria-label={`World map with ${model.pins.length - 1} visited places marked`}
      className="h-auto w-full"
    >
      {model.dots.map((d) => (
        <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={0.22} className="fill-dim opacity-50" />
      ))}
      {model.pins.map((p) => (
        <circle
          key={`pin-${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r={0.45}
          className={p.slug === HOME_PIN ? 'fill-fg' : 'fill-warn'}
        />
      ))}
    </svg>
  );
}
