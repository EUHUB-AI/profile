import { describe, expect, it } from 'vitest';
import { buildTravelMap } from './travelMap';

describe('buildTravelMap', () => {
  const model = buildTravelMap(
    [
      { lat: 35.6762, lng: 139.6503, slug: 'japan' },
      { lat: 64.1466, lng: -21.9426, slug: 'iceland' },
    ],
    { lat: 48.1486, lng: 17.1077 },
  );

  it('draws land dots for the whole world', () => {
    expect(model.dots.length).toBeGreaterThan(1000);
  });

  it('adds one pin per place plus home', () => {
    expect(model.pins.map((p) => p.slug).sort()).toEqual(['__home', 'iceland', 'japan']);
  });

  it('keeps pins inside the drawing area', () => {
    for (const pin of model.pins) {
      expect(pin.x).toBeGreaterThanOrEqual(0);
      expect(pin.x).toBeLessThanOrEqual(model.width);
      expect(pin.y).toBeGreaterThanOrEqual(0);
      expect(pin.y).toBeLessThanOrEqual(model.height);
    }
  });
});
