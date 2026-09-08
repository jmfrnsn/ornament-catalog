import assert from "node:assert/strict";
import test from "node:test";
import { geoOrthographic } from "d3-geo";
import { geographyPinch, pinchGeographyCamera, rotateGeographyByPixels, type GeographyCamera } from "./geography-camera";

test("pinch geometry tracks distance and midpoint without finger-order dependence", () => {
  assert.deepEqual(geographyPinch([10, 20], [70, 100]), { midpoint: [40, 60], distance: 100 });
  assert.deepEqual(geographyPinch([10, 20], [70, 100]), geographyPinch([70, 100], [10, 20]));
});

test("pinch zoom preserves the point between fingers, including a moving midpoint", () => {
  const camera: GeographyCamera = { rotation: [-12, -42], zoom: 2, pan: [21, -37] };
  const center: [number, number] = [720, 324];
  const start = geographyPinch([400, 200], [500, 200]);
  for (const factor of [.1, .5, 1, 2, 10]) {
    const current = { midpoint: [480, 250] as [number, number], distance: start.distance * factor };
    const next = pinchGeographyCamera(camera, start, current, center);
    // Any projected geography point transforms by the same scale/translation.
    const ratio = next.zoom / camera.zoom;
    const projected = start.midpoint.map((value, axis) =>
      center[axis] + next.pan[axis] + (value - center[axis] - camera.pan[axis]) * ratio);
    assert.deepEqual(projected, current.midpoint);
    assert.deepEqual(next.rotation, camera.rotation);
    assert.ok(next.zoom >= .75 && next.zoom <= 8);
  }
});

test("pinching out and back restores the camera without cumulative drift", () => {
  const camera: GeographyCamera = { rotation: [20, -50], zoom: 2, pan: [-11, 42] };
  const center: [number, number] = [187.5, 190];
  const start = geographyPinch([100, 150], [200, 150]);
  const end = geographyPinch([90, 180], [290, 180]);
  const expanded = pinchGeographyCamera(camera, start, end, center);
  assert.deepEqual(pinchGeographyCamera(expanded, end, start, center), camera);
  assert.ok(pinchGeographyCamera(camera, geographyPinch([0, 0], [0, 0]), end, center).pan.every(Number.isFinite));
});

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
