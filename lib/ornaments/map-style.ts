import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

const MAPBOX_LIGHT =
  "https://api.mapbox.com/styles/v1/mapbox/light-v11";
const OPEN_FREE_MAP_POSITRON =
  "https://tiles.openfreemap.org/styles/positron";

const PAPER = "#fafaf5";
const INK = "#27301c";
const WATER = "#d8dcd0";

export function mapboxAccessToken() {
  return (
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    ""
  );
}

/** Mapbox Light when a public token is set; otherwise OpenFreeMap Positron. */
export function catalogMapStyle(): string {
  const token = mapboxAccessToken();
  if (token) {
    return `${MAPBOX_LIGHT}?access_token=${encodeURIComponent(token)}`;
  }
  return OPEN_FREE_MAP_POSITRON;
}

export function applyCatalogMapPaint(map: MapLibreMap) {
  const style = map.getStyle() as StyleSpecification | undefined;
  if (!style?.layers) return;

  for (const layer of style.layers) {
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", PAPER);
      } else if (layer.type === "fill" && /water/i.test(layer.id)) {
        map.setPaintProperty(layer.id, "fill-color", WATER);
      } else if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-color", INK);
        map.setPaintProperty(layer.id, "text-halo-color", PAPER);
      }
    } catch {
      // Layer paint props vary between Mapbox Light and OpenFreeMap.
    }
  }
}
