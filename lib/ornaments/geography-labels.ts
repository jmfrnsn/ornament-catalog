export type GeographyPin = { code: string; name: string; x: number; y: number };
export type GeographyLabel = GeographyPin & { left: number; top: number; width: number; height: number };
export type GeographyConnector = { x1: number; y1: number; x2: number; y2: number };
export type GeographyLabelOffset = { dx: number; dy: number; width: number; height: number };

/** Plan once against the overview, not against the moving camera. */
export function createGeographyLabelLayout(pins: GeographyPin[], width: number, height: number) {
  return new Map(placeGeographyLabels(pins, width, height).map(label => [
    label.code, { dx: label.left - label.x, dy: label.top - label.y, width: label.width, height: label.height },
  ]));
}

/** Translate each label with its pin. Never re-sort, clamp or repack during navigation. */
export function projectGeographyLabels(pins: GeographyPin[], layout: ReadonlyMap<string, GeographyLabelOffset>): GeographyLabel[] {
  return pins.flatMap(pin => {
    const offset = layout.get(pin.code);
    return offset ? [{ ...pin, left: pin.x + offset.dx, top: pin.y + offset.dy, width: offset.width, height: offset.height }] : [];
  });
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const overlap = (a: GeographyLabel, b: GeographyLabel, gap = 8) =>
  Math.max(0, Math.min(a.left + a.width + gap, b.left + b.width) - Math.max(a.left - gap, b.left)) *
  Math.max(0, Math.min(a.top + a.height + gap, b.top + b.height) - Math.max(a.top - gap, b.top));

/** Intersect the pin-to-label-center ray with the correct edge, clear of rounded corners. */
export function geographyLabelConnector(label: GeographyLabel): GeographyConnector | null {
  const cx = label.left + label.width / 2;
  const cy = label.top + label.height / 2;
  const dx = label.x - cx;
  const dy = label.y - cy;
  if (Math.abs(dx) <= label.width / 2 && Math.abs(dy) <= label.height / 2) return null;
  const horizontal = Math.abs(dx) / label.width > Math.abs(dy) / label.height;
  const t = horizontal ? label.width / 2 / Math.abs(dx) : label.height / 2 / Math.abs(dy);
  return {
    x1: label.x, y1: label.y,
    x2: horizontal ? cx + dx * t : clamp(cx + dx * t, label.left + 4, label.left + label.width - 4),
    y2: horizontal ? clamp(cy + dy * t, label.top + 4, label.top + label.height - 4) : cy + dy * t,
  };
}

function connectorCrossesLabel(line: GeographyConnector | null, label: GeographyLabel) {
  if (!line) return false;
  let start = 0;
  let end = 1;
  for (const [origin, delta, min, max] of [
    [line.x1, line.x2 - line.x1, label.left - 3, label.left + label.width + 3],
    [line.y1, line.y2 - line.y1, label.top - 3, label.top + label.height + 3],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < min || origin > max) return false;
    } else {
      const a = (min - origin) / delta;
      const b = (max - origin) / delta;
      start = Math.max(start, Math.min(a, b));
      end = Math.min(end, Math.max(a, b));
      if (start > end) return false;
    }
  }
  return true;
}

/** Keep country labels close to their pins, apart from one another and clear of controls. */
export function placeGeographyLabels(pins: GeographyPin[], width: number, height: number): GeographyLabel[] {
  const placed: GeographyLabel[] = [];
  const compact = width < 600;
  for (const pin of [...pins].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const labelWidth = Math.min(width - 24, (compact ? 62 : 68) + pin.name.length * (compact ? 5.5 : 6));
    const labelHeight = 28;
    const maxX = width - labelWidth - 12;
    const maxY = Math.max(12, height - labelHeight - 76);
    const preferredX = pin.x < width / 2 ? pin.x - labelWidth - 22 : pin.x + 22;
    const xs = [preferredX, pin.x + 22, pin.x - labelWidth - 22, 12, maxX, (width - labelWidth) / 2];
    const ys = [0, -36, 36, -72, 72, -108, 108, -144, 144].map(offset => pin.y - labelHeight / 2 + offset);
    let best: GeographyLabel | undefined;
    let bestScore = Infinity;
    for (const x of xs) for (const y of ys) {
      const candidate = { ...pin, left: clamp(x, 12, maxX), top: clamp(y, 12, maxY), width: labelWidth, height: labelHeight };
      const distance = (candidate.left + labelWidth / 2 - pin.x) ** 2 + (candidate.top + labelHeight / 2 - pin.y) ** 2;
      const collisions = placed.reduce((sum, other) => sum + overlap(candidate, other), 0);
      const coveredPins = pins.filter(point => point.x > candidate.left - 8 && point.x < candidate.left + labelWidth + 8 && point.y > candidate.top - 8 && point.y < candidate.top + labelHeight + 8).length;
      const connector = geographyLabelConnector(candidate);
      const crossings = placed.filter(other => connectorCrossesLabel(connector, other) || connectorCrossesLabel(geographyLabelConnector(other), candidate)).length;
      const score = distance + collisions * 1e6 + coveredPins * 1e5 + crossings * 1e5 + Math.abs(candidate.left - preferredX) * 8;
      if (score < bestScore) { best = candidate; bestScore = score; }
    }
    if (best) placed.push(best);
  }
  return placed;
}
