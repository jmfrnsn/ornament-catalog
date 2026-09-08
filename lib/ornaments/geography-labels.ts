export type GeographyPin = { code: string; name: string; x: number; y: number };
export type GeographyLabel = GeographyPin & { left: number; top: number; width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const overlap = (a: GeographyLabel, b: GeographyLabel, gap = 8) =>
  Math.max(0, Math.min(a.left + a.width + gap, b.left + b.width) - Math.max(a.left - gap, b.left)) *
  Math.max(0, Math.min(a.top + a.height + gap, b.top + b.height) - Math.max(a.top - gap, b.top));

/** Keep country labels close to their pins, apart from one another and clear of controls. */
export function placeGeographyLabels(pins: GeographyPin[], width: number, height: number): GeographyLabel[] {
  const placed: GeographyLabel[] = [];
  const compact = width < 600;
  for (const pin of [...pins].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const labelWidth = Math.min(width - 24, (compact ? 62 : 68) + pin.name.length * (compact ? 5.5 : 6));
    const labelHeight = 40;
    const maxX = width - labelWidth - 12;
    const maxY = Math.max(12, height - labelHeight - 76);
    const preferredX = pin.x < width / 2 ? pin.x - labelWidth - 22 : pin.x + 22;
    const xs = [preferredX, pin.x + 22, pin.x - labelWidth - 22, 12, maxX, (width - labelWidth) / 2];
    const ys = [0, -48, 48, -96, 96, -144, 144, -192, 192].map(offset => pin.y - labelHeight / 2 + offset);
    let best: GeographyLabel | undefined;
    let bestScore = Infinity;
    for (const x of xs) for (const y of ys) {
      const candidate = { ...pin, left: clamp(x, 12, maxX), top: clamp(y, 12, maxY), width: labelWidth, height: labelHeight };
      const distance = (candidate.left + labelWidth / 2 - pin.x) ** 2 + (candidate.top + labelHeight / 2 - pin.y) ** 2;
      const collisions = placed.reduce((sum, other) => sum + overlap(candidate, other), 0);
      const coveredPins = pins.filter(point => point.x > candidate.left - 8 && point.x < candidate.left + labelWidth + 8 && point.y > candidate.top - 8 && point.y < candidate.top + labelHeight + 8).length;
      const score = distance + collisions * 1e6 + coveredPins * 1e5 + Math.abs(candidate.left - preferredX) * 8;
      if (score < bestScore) { best = candidate; bestScore = score; }
    }
    if (best) placed.push(best);
  }
  return placed;
}
