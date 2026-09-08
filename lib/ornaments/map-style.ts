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

/**
 * MapLibre does not resolve `mapbox://` sprite, glyph, or tileset URLs.
 * Rewrite them to Mapbox HTTPS APIs and attach the public token.
 */
export function transformCatalogMapRequest(
  url: string,
  resourceType?: string,
): { url: string } {
  const token = mapboxAccessToken();
  if (!token) return { url };

  if (url.startsWith("mapbox://")) {
    return { url: normalizeMapboxUrl(url, resourceType, token) };
  }

  if (isMapboxHttpUrl(url) && !url.includes("access_token=")) {
    const join = url.includes("?") ? "&" : "?";
    return { url: `${url}${join}access_token=${encodeURIComponent(token)}` };
  }

  return { url };
}

function isMapboxHttpUrl(url: string) {
  return (
    url.startsWith("https://api.mapbox.com/") ||
    url.startsWith("https://a.tiles.mapbox.com/") ||
    url.startsWith("https://b.tiles.mapbox.com/") ||
    url.startsWith("https://c.tiles.mapbox.com/") ||
    url.startsWith("https://d.tiles.mapbox.com/")
  );
}

function normalizeMapboxUrl(
  url: string,
  resourceType: string | undefined,
  token: string,
): string {
  if (url.startsWith("mapbox://styles/")) {
    const path = url.slice("mapbox://styles/".length);
    return mapboxApiUrl(`/styles/v1/${path}`, token);
  }

  if (url.startsWith("mapbox://sprites/")) {
    return normalizeSpriteUrl(url, token);
  }

  if (url.startsWith("mapbox://fonts/")) {
    const path = url.slice("mapbox://fonts/".length);
    return mapboxApiUrl(`/fonts/v1/${path}`, token);
  }

  if (resourceType === "Tile") {
    const tileset = url.slice("mapbox://".length);
    return mapboxApiUrl(`/v4/${tileset}`, token);
  }

  const tileset = url.slice("mapbox://".length);
  return mapboxApiUrl(`/v4/${tileset}.json`, token, ["secure"]);
}

function normalizeSpriteUrl(url: string, token: string): string {
  // MapLibre requests `{sprite}[.json|.png]` and `{sprite}@2x[.json|.png]`.
  const rest = url.slice("mapbox://sprites/".length);
  const match = rest.match(/^(.*?)(@2x)?(?:\.(json|png))?$/);
  const styleId = match?.[1] ?? rest;
  const retina = match?.[2] ?? "";
  const extension = match?.[3] ? `.${match[3]}` : "";
  return mapboxApiUrl(
    `/styles/v1/${styleId}/sprite${retina}${extension}`,
    token,
  );
}

function mapboxApiUrl(path: string, token: string, extraQuery: string[] = []) {
  const params = [
    ...extraQuery,
    `access_token=${encodeURIComponent(token)}`,
  ].join("&");
  return `https://api.mapbox.com${path}?${params}`;
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
