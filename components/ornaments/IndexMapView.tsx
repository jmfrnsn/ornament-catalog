"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

import { OrnamentImage } from "@/components/ornaments/OrnamentImage";
import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";
import {
  applyCatalogMapPaint,
  catalogMapStyle,
  transformCatalogMapRequest,
} from "@/lib/ornaments/map-style";
import {
  originCameraLngLat,
  originClusterKey,
  originFanOffset,
  originFitBounds,
  resolveOrnamentOrigin,
  type OrnamentOrigin,
} from "@/lib/ornaments/origins";

type IndexMapViewProps = {
  figures: OrnamentFigure[];
  /** True when the era filter is All — show a globe; otherwise a fitted map. */
  globalSelection: boolean;
  embed?: boolean;
  reduceMotion?: boolean;
};

type LocatedFigure = {
  figure: OrnamentFigure;
  origin: OrnamentOrigin;
};

type ProjectedPin = LocatedFigure & {
  x: number;
  y: number;
  visible: boolean;
};

function sourceHref(sourceId: string, embed: boolean) {
  return embed ? `/sources/${sourceId}?embed=1` : `/sources/${sourceId}`;
}

function haversineRad(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function applyCamera(
  map: MapLibreMap,
  isGlobe: boolean,
  origins: OrnamentOrigin[],
  reduceMotion: boolean,
) {
  const duration = reduceMotion ? 0 : 850;
  const projection = map.getProjection();
  const nextType = isGlobe ? "globe" : "mercator";
  if (projection?.type !== nextType) {
    map.setProjection({ type: nextType });
  }

  if (origins.length === 0) {
    map.easeTo({ center: [12, 42], zoom: isGlobe ? 1.85 : 2, duration });
    return;
  }

  if (isGlobe) {
    const center = originCameraLngLat(origins);
    map.easeTo({ center, zoom: 1.9, duration });
    return;
  }

  map.fitBounds(originFitBounds(origins), {
    padding: { top: 64, bottom: 80, left: 64, right: 64 },
    maxZoom: 6.4,
    duration,
  });
}

function projectPins(
  map: MapLibreMap,
  located: LocatedFigure[],
): ProjectedPin[] {
  const center = map.getCenter();
  const globe = map.getProjection()?.type === "globe";
  const clusters = new Map<string, LocatedFigure[]>();
  for (const entry of located) {
    const key = originClusterKey(entry.origin);
    const group = clusters.get(key);
    if (group) group.push(entry);
    else clusters.set(key, [entry]);
  }

  const next: ProjectedPin[] = [];
  for (const group of clusters.values()) {
    group.forEach((entry, clusterIndex) => {
      const point = map.project([entry.origin.lng, entry.origin.lat]);
      const offset = originFanOffset(clusterIndex, group.length);
      const visible =
        !globe ||
        haversineRad(
          center.lng,
          center.lat,
          entry.origin.lng,
          entry.origin.lat,
        ) < 1.42;
      next.push({
        ...entry,
        x: point.x + offset.dx,
        y: point.y + offset.dy,
        visible,
      });
    });
  }
  return next;
}

export function IndexMapView({
  figures,
  globalSelection,
  embed = false,
  reduceMotion = false,
}: IndexMapViewProps) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const viewRef = useRef({
    isGlobe: globalSelection,
    origins: [] as OrnamentOrigin[],
    reduceMotion,
  });
  const locatedRef = useRef<LocatedFigure[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [pins, setPins] = useState<ProjectedPin[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const located = useMemo<LocatedFigure[]>(() => {
    const next: LocatedFigure[] = [];
    for (const figure of figures) {
      const origin = resolveOrnamentOrigin(figure.source);
      if (origin) next.push({ figure, origin });
    }
    return next;
  }, [figures]);

  const unlocatedCount = figures.length - located.length;
  const isGlobe = globalSelection;
  const selectionKey = `${isGlobe}:${figures.map((figure) => figure.source.id).join(",")}`;
  const origins = useMemo(
    () => located.map((entry) => entry.origin),
    [located],
  );

  useEffect(() => {
    viewRef.current = { isGlobe, origins, reduceMotion };
    locatedRef.current = located;
  }, [isGlobe, located, origins, reduceMotion]);

  useEffect(() => {
    const node = mapNodeRef.current;
    if (!node) return;

    const map = new MapLibreMap({
      container: node,
      style: catalogMapStyle(),
      center: [12, 42],
      zoom: 1.9,
      minZoom: 1.1,
      maxZoom: 12,
      pitch: 0,
      maxPitch: 0,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
      transformRequest: transformCatalogMapRequest,
    });
    mapRef.current = map;

    const syncPins = () => {
      setPins(projectPins(map, locatedRef.current));
    };

    map.on("style.load", () => {
      const view = viewRef.current;
      applyCatalogMapPaint(map);
      applyCamera(map, view.isGlobe, view.origins, true);
      map.resize();
      setMapReady(true);
      syncPins();
    });
    map.on("load", () => map.resize());
    map.on("move", syncPins);

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyCamera(map, isGlobe, origins, reduceMotion);
  }, [isGlobe, mapReady, origins, reduceMotion, selectionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setPins(projectPins(map, located));
  }, [located, mapReady]);

  const places = useMemo(() => {
    const seen = new Map<string, OrnamentOrigin>();
    for (const entry of located) {
      if (!seen.has(entry.origin.label)) {
        seen.set(entry.origin.label, entry.origin);
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [located]);

  const active =
    pins.find((pin) => pin.figure.source.id === activeId) ?? pins[0] ?? null;

  function focusPlace(origin: OrnamentOrigin) {
    const match = located.find((entry) => entry.origin.label === origin.label);
    if (match) setActiveId(match.figure.source.id);
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [origin.lng, origin.lat],
      duration: reduceMotion ? 0 : 700,
      zoom: Math.max(map.getZoom(), isGlobe ? 2.4 : map.getZoom()),
    });
  }

  const captionTitle = active
    ? active.figure.titleLabel
    : isGlobe
      ? "Cursor Map"
      : "Origin map";
  const captionMeta = active
    ? `${active.origin.label}${active.figure.source.year?.trim() ? ` · ${active.figure.source.year.trim()}` : ""}`
    : isGlobe
      ? "Drag to turn the globe"
      : "Fitted to the current selection";

  return (
    <div className="ornament-index-map">
      <div
        className={`ornament-index-map-stage ${
          isGlobe ? "is-globe" : "is-sheet"
        }`}
      >
        <div
          ref={mapNodeRef}
          className="ornament-index-map-canvas"
          role="img"
          aria-label={
            isGlobe
              ? "Globe showing where each ornament originates"
              : "Map showing where the selected ornaments originate"
          }
        />

        {pins.map((pin) => {
          const selected = pin.figure.source.id === active?.figure.source.id;
          return (
            <Link
              key={pin.figure.source.id}
              href={sourceHref(pin.figure.source.id, embed)}
              className={`ornament-index-map-pin ${
                pin.visible ? "is-visible" : ""
              } ${selected ? "is-active" : ""}`}
              style={{
                left: pin.x,
                top: pin.y,
                transition: reduceMotion ? "none" : undefined,
                zIndex: selected ? 8 : pin.visible ? 2 : 0,
              }}
              aria-label={`${pin.figure.source.title}, ${pin.origin.label}`}
              aria-current={selected ? "true" : undefined}
              tabIndex={pin.visible ? 0 : -1}
              onMouseEnter={() => setActiveId(pin.figure.source.id)}
              onFocus={() => setActiveId(pin.figure.source.id)}
            >
              <span className="ornament-index-map-pin-plate">
                {pin.figure.source.imageUrl ? (
                  <OrnamentImage
                    src={pin.figure.source.imageUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                ) : (
                  <span className="block h-full w-full bg-ink/5" />
                )}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="ornament-index-map-caption">
        <p className="ornament-index-map-caption-title">{captionTitle}</p>
        <p className="ornament-index-map-caption-meta">{captionMeta}</p>
      </div>

      <div
        className="ornament-index-map-legend"
        role="group"
        aria-label="Origins"
      >
        <span className="ornament-index-map-legend-count">
          {located.length} {located.length === 1 ? "origin" : "origins"}
          {unlocatedCount ? ` · ${unlocatedCount} unlocated` : ""}
        </span>
        {places.map((place, index) => {
          const selected = active?.origin.label === place.label;
          return (
            <span key={place.label}>
              {index === 0 ? (
                <span aria-hidden> · </span>
              ) : (
                <span aria-hidden>, </span>
              )}
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => focusPlace(place)}
                className={`cursor-pointer uppercase transition-colors ${
                  selected ? "text-ink" : "text-ink/55 hover:text-ink"
                }`}
              >
                {place.label}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
