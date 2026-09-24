import DottedMap from 'dotted-map';
import type { Coord } from './travel';

export const HOME_PIN = '__home';

export interface MapModel {
  width: number;
  height: number;
  dots: { x: number; y: number }[];
  pins: { x: number; y: number; slug: string }[];
}

function pinSlug(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('slug' in data)) return undefined;
  const { slug } = data as { slug: unknown };
  return typeof slug === 'string' ? slug : undefined;
}

export function buildTravelMap(places: (Coord & { slug: string })[], home: Coord): MapModel {
  const map = new DottedMap({ height: 40, grid: 'diagonal', projection: { name: 'robinson' } });
  for (const place of places) map.addPin({ lat: place.lat, lng: place.lng, data: { slug: place.slug } });
  map.addPin({ lat: home.lat, lng: home.lng, data: { slug: HOME_PIN } });

  const model: MapModel = { width: 0, height: 0, dots: [], pins: [] };
  for (const point of map.getPoints()) {
    model.width = Math.max(model.width, point.x + 1);
    model.height = Math.max(model.height, point.y + 1);
    const slug = pinSlug(point.data);
    if (slug) model.pins.push({ x: point.x, y: point.y, slug });
    else model.dots.push({ x: point.x, y: point.y });
  }
  return model;
}
