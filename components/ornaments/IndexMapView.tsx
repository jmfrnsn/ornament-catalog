"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  geoDistance,
  geoGraticule10,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
} from "d3-geo";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";

import { OrnamentImage } from "@/components/ornaments/OrnamentImage";
import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";
import {
  originCentroidRotation,
  originClusterKey,
  originFanOffset,
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
  clusterIndex: number;
  clusterCount: number;
};

const land = feature(landTopology, landTopology.objects.land);
const graticule = geoGraticule10();
const SPHERE = { type: "Sphere" } as GeoPermissibleObjects;

function sourceHref(sourceId: string, embed: boolean) {
  return embed ? `/sources/${sourceId}?embed=1` : `/sources/${sourceId}`;
}

function paddedExtent(origins: OrnamentOrigin[]): GeoJSON.Feature {
  const lats = origins.map((origin) => origin.lat);
  const lngs = origins.map((origin) => origin.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  const latPad = Math.max(10, (maxLat - minLat) * 0.55 || 14);
  const lngPad = Math.max(12, (maxLng - minLng) * 0.55 || 16);
  minLat = Math.max(-85, minLat - latPad);
  maxLat = Math.min(85, maxLat + latPad);
  minLng -= lngPad;
  maxLng += lngPad;

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

function buildProjection(
  width: number,
  height: number,
  isGlobe: boolean,
  rotation: [number, number],
  origins: OrnamentOrigin[],
): GeoProjection {
  if (isGlobe) {
    const radius = Math.max(88, Math.min(width, height) * 0.42);
    return geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2 + 4])
      .rotate([rotation[0], rotation[1], 0])
      .clipAngle(90)
      .precision(0.4);
  }

  const projection = geoNaturalEarth1().precision(0.4);
  const subject = origins.length > 0 ? paddedExtent(origins) : SPHERE;
  projection.fitExtent(
    [
      [36, 32],
      [width - 36, height - 48],
    ],
    subject,
  );
  return projection;
}

function isOnFront(projection: GeoProjection, lng: number, lat: number) {
  const rotate = projection.rotate();
  const center: [number, number] = [-rotate[0], -rotate[1]];
  return geoDistance(center, [lng, lat]) <= Math.PI / 2 - 0.04;
}

export function IndexMapView({
  figures,
  globalSelection,
  embed = false,
  reduceMotion = false,
}: IndexMapViewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [grabbing, setGrabbing] = useState(false);

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
  const defaultRotation = useMemo(
    () => originCentroidRotation(located.map((entry) => entry.origin)),
    [located],
  );

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const apply = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(280, Math.round(rect.width));
      const height = Math.max(320, Math.round(rect.height));
      setSize((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const [dragRotation, setDragRotation] = useState<[number, number] | null>(
    null,
  );
  const [rotationKey, setRotationKey] = useState(selectionKey);
  if (rotationKey !== selectionKey) {
    setRotationKey(selectionKey);
    setDragRotation(null);
  }
  const rotation = dragRotation ?? defaultRotation;

  const [activeId, setActiveId] = useState<string | null>(null);

  const projection = useMemo(
    () =>
      size
        ? buildProjection(
            size.width,
            size.height,
            isGlobe,
            rotation,
            located.map((entry) => entry.origin),
          )
        : null,
    [isGlobe, located, rotation, size],
  );

  const path = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection],
  );
  const landPath = path?.(land) ?? "";
  const graticulePath = path?.(graticule) ?? "";
  const spherePath = path?.(SPHERE) ?? "";
  const globeRadius = isGlobe && projection ? projection.scale() : 0;
  const [tx, ty] = projection?.translate() ?? [0, 0];

  const pins = useMemo<ProjectedPin[]>(() => {
    if (!projection) return [];
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
        const point = projection([entry.origin.lng, entry.origin.lat]);
        const visible =
          Boolean(point) &&
          (!isGlobe || isOnFront(projection, entry.origin.lng, entry.origin.lat));
        const offset = originFanOffset(clusterIndex, group.length);
        next.push({
          ...entry,
          x: (point?.[0] ?? 0) + offset.dx,
          y: (point?.[1] ?? 0) + offset.dy,
          visible,
          clusterIndex,
          clusterCount: group.length,
        });
      });
    }
    return next;
  }, [isGlobe, located, projection]);

  const places = useMemo(() => {
    const seen = new Map<string, OrnamentOrigin>();
    for (const entry of located) {
      if (!seen.has(entry.origin.label)) seen.set(entry.origin.label, entry.origin);
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [located]);

  const active =
    pins.find((pin) => pin.figure.source.id === activeId) ?? pins[0] ?? null;

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isGlobe || event.button !== 0) return;
    if ((event.target as HTMLElement | null)?.closest("a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setGrabbing(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setDragRotation((current) => {
      const [lambda, phi] = current ?? defaultRotation;
      return [
        lambda + dx * 0.38,
        Math.max(-68, Math.min(68, phi - dy * 0.38)),
      ];
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setGrabbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function focusPlace(origin: OrnamentOrigin) {
    const match = located.find((entry) => entry.origin.label === origin.label);
    if (match) setActiveId(match.figure.source.id);
    if (isGlobe) {
      setDragRotation([-origin.lng, -origin.lat]);
    }
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
        ref={stageRef}
        className={`ornament-index-map-stage ${
          isGlobe ? "is-globe" : "is-sheet"
        } ${grabbing ? "is-grabbing" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {size ? (
          <svg
            className="ornament-index-map-svg"
            viewBox={`0 0 ${size.width} ${size.height}`}
            role="img"
            aria-label={
              isGlobe
                ? "Globe showing where each ornament originates"
                : "Map showing where the selected ornaments originate"
            }
          >
            {isGlobe && spherePath ? (
              <path className="ornament-index-map-ocean" d={spherePath} />
            ) : null}
            {graticulePath ? (
              <path className="ornament-index-map-graticule" d={graticulePath} />
            ) : null}
            {landPath ? (
              <path className="ornament-index-map-land" d={landPath} />
            ) : null}
            {isGlobe && spherePath ? (
              <path className="ornament-index-map-limb" d={spherePath} />
            ) : null}
          </svg>
        ) : null}

        {isGlobe && size ? (
          <div
            aria-hidden
            className="ornament-index-map-sheen"
            style={{
              width: globeRadius * 2,
              height: globeRadius * 2,
              left: tx - globeRadius,
              top: ty - globeRadius,
            }}
          />
        ) : null}

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
              onFocus={() => {
                setActiveId(pin.figure.source.id);
              }}
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
          {unlocatedCount
            ? ` · ${unlocatedCount} unlocated`
            : ""}
        </span>
        {places.map((place, index) => {
          const selected = active?.origin.label === place.label;
          return (
            <span key={place.label}>
              {index === 0 ? <span aria-hidden> · </span> : <span aria-hidden>, </span>}
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
