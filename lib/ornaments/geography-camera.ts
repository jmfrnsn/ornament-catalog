const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
