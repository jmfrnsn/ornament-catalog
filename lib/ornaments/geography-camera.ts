const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type GeographyPoint = [number, number];
export type GeographyCamera = { rotation: GeographyPoint; zoom: number; pan: GeographyPoint };
export type GeographyPinch = { midpoint: GeographyPoint; distance: number };

export function geographyPinch(a: GeographyPoint, b: GeographyPoint): GeographyPinch {
  return { midpoint: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], distance: Math.hypot(b[0] - a[0], b[1] - a[1]) };
}

/** Scale about the gesture's focal point, including simultaneous two-finger panning. */
export function pinchGeographyCamera(
  camera: GeographyCamera, start: GeographyPinch, current: GeographyPinch, center: GeographyPoint,
): GeographyCamera {
  const zoom = clamp(camera.zoom * current.distance / Math.max(1, start.distance), .75, 8);
  const ratio = zoom / camera.zoom;
  return {
    rotation: camera.rotation,
    zoom,
    pan: [
      current.midpoint[0] - center[0] - (start.midpoint[0] - center[0] - camera.pan[0]) * ratio,
      current.midpoint[1] - center[1] - (start.midpoint[1] - center[1] - camera.pan[1]) * ratio,
    ],
  };
}

/**
 * Keep movement near the globe's center approximately one screen pixel per pointer pixel.
 * The orthographic radius already includes zoom. Correct horizontal movement for latitude,
 * but cap the correction near the poles so rotation never becomes excessively sensitive.
 */
export function rotateGeographyByPixels(
  rotation: [number, number], dx: number, dy: number, projectedRadius: number,
): [number, number] {
  const degreesPerPixel = 180 / Math.PI / Math.max(1, projectedRadius);
  const latitudeFactor = Math.max(.25, Math.cos(rotation[1] * Math.PI / 180));
  return [
    rotation[0] + dx * degreesPerPixel / latitudeFactor,
    clamp(rotation[1] - dy * degreesPerPixel, -80, 80),
  ];
}
