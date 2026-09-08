import assert from "node:assert/strict";
import test from "node:test";
import { geoOrthographic } from "d3-geo";
import { rotateGeographyByPixels } from "./geography-camera";

test("globe drag sensitivity decreases in inverse proportion to zoom", () => {
  const rotation: [number, number] = [-12, -42];
  const baseline = rotateGeographyByPixels(rotation, 40, 24, 280);
  for (const zoom of [.75, 1, 2, 4, 8]) {
    const result = rotateGeographyByPixels(rotation, 40, 24, 280 * zoom);
    assert.ok(Math.abs((result[0] - rotation[0]) * zoom - (baseline[0] - rotation[0])) < 1e-10);
    assert.ok(Math.abs((result[1] - rotation[1]) * zoom - (baseline[1] - rotation[1])) < 1e-10);
  }
});

test("zoomed geography follows screen drag distance on desktop and mobile", () => {
  for (const size of [375, 648]) for (const zoom of [2, 4, 8]) for (const latitude of [0, 42, 65]) {
    const rotation: [number, number] = [-12, -latitude];
    const radius = size * .43 * zoom;
    const after = rotateGeographyByPixels(rotation, 24, 16, radius);
    const point = geoOrthographic().translate([0, 0]).scale(radius).rotate(after)([12, latitude])!;
    assert.ok(Math.abs(point[0] - 24) < 2.5, `horizontal: ${size}px, ${zoom}x, ${latitude}°, ${point[0]}`);
    assert.ok(Math.abs(point[1] - 16) < 2.5, `vertical: ${size}px, ${zoom}x, ${latitude}°, ${point[1]}`);
  }
});

test("zero movement, opposite directions and pole limits remain well behaved", () => {
  assert.deepEqual(rotateGeographyByPixels([-12, -42], 0, 0, 400), [-12, -42]);
  const rightDown = rotateGeographyByPixels([0, 0], 40, 40, 400);
  const leftUp = rotateGeographyByPixels([0, 0], -40, -40, 400);
  assert.ok(rightDown[0] > 0 && rightDown[1] < 0);
  assert.deepEqual(leftUp, rightDown.map(value => -value));
  for (const latitude of [-80, 80]) {
    const result = rotateGeographyByPixels([0, latitude], 10, 10000, 0);
    assert.ok(result.every(Number.isFinite));
    assert.ok(result[1] >= -80 && result[1] <= 80);
  }
});
