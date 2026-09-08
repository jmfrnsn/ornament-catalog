"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";

import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";
import { geographicDisplayMode, groupFigureOrigins, type OriginGroup } from "@/lib/ornaments/geography";
import { createGeographyLabelLayout, geographyLabelConnector, projectGeographyLabels } from "@/lib/ornaments/geography-labels";
import "./geography.css";

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = feature(topology, topology.objects.countries).features;
const graticule = geoGraticule10();
const BASE_ROTATION: [number, number] = [-50, -30];
const MAX_ZOOM = 8;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Props = {
  figures: OrnamentFigure[];
};

function mainPolygon(country: Feature<Geometry>) {
  if (country.geometry.type !== "MultiPolygon") return country;
  // Drop overseas islands when fitting a regional viewport, not when drawing.
  const polygons = country.geometry.coordinates;
  const largest = [...polygons].sort((a, b) => b[0].length - a[0].length)[0];
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: largest } } as Feature<Geometry>;
}

function regionalProjection(groups: OriginGroup[], width: number, height: number) {
  const codes = new Set(groups.map(group => group.region.code));
  const selection = countries.filter(country => codes.has(String(country.id))).map(mainPolygon);
  const map = geoMercator();
  if (selection.length) {
    map.fitExtent([[32, 32], [width - 32, height - 64]], { type: "FeatureCollection", features: selection });
  } else map.center([10, 46]).scale(480).translate([width / 2, height / 2]);
  return map;
}

export function IndexGeographyView(props: Props) {
  const origins = useMemo(() => groupFigureOrigins(props.figures), [props.figures]);
  const mode = geographicDisplayMode(origins.groups);
  // Reset navigation when the era/archival selection changes.
  const selectionKey = props.figures.map((figure) => figure.source.id).join("|");
  return <GeographyPanel key={selectionKey} {...props} {...origins} mode={mode} />;
}

function GeographyPanel({
  groups, mode,
}: Props & ReturnType<typeof groupFigureOrigins> & { mode: "globe" | "map" }) {
  const id = useId();
  const [{ width: WIDTH, height: HEIGHT, measured }, setSize] = useState({ width: 840, height: 580, measured: false });
  const compact = WIDTH < 600;
  const reduceMotion = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLDivElement>(null);
  const inView = useInView(canvasRef, { amount: .15 });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [rotation, setRotation] = useState<[number, number]>(BASE_ROTATION);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const cameraAnimation = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => cameraAnimation.current?.stop(), []);
  const drag = useRef<{ x: number; y: number; rotation: [number, number]; pan: [number, number]; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) setSize(previous => previous.measured && previous.width === width && previous.height === height ? previous : { width, height, measured: true });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const isGlobe = mode === "globe";
  const activeCode = selectedCode;

  // These offsets only change with the collection, projection type or viewport.
  // Using the moving projection here causes discrete candidate/sort changes on every drag frame.
  const labelLayout = useMemo(() => {
    const overview = isGlobe
      ? geoOrthographic().rotate(BASE_ROTATION).translate([WIDTH / 2, HEIGHT / 2]).scale(Math.min(WIDTH, HEIGHT) * .43)
      : regionalProjection(groups, WIDTH, HEIGHT);
    const referencePins = groups.flatMap(group => {
      const point = overview(group.region.coordinates);
      return point ? [{ code: group.region.code, name: group.region.name, x: point[0], y: point[1] }] : [];
    });
    return createGeographyLabelLayout(referencePins, WIDTH, HEIGHT);
  }, [groups, isGlobe, WIDTH, HEIGHT]);

  const projection = useMemo(() => {
    if (isGlobe) {
      return geoOrthographic()
        .rotate([rotation[0], rotation[1], 0])
        .translate([WIDTH / 2, HEIGHT / 2])
        .scale(Math.min(WIDTH, HEIGHT) * .43 * zoom)
        .clipExtent([[0, 0], [WIDTH, HEIGHT]]);
    }
    const map = regionalProjection(groups, WIDTH, HEIGHT);
    const translation = map.translate();
    return map
      .scale(map.scale() * zoom)
      .translate([
        (translation[0] - WIDTH / 2) * zoom + WIDTH / 2 + pan[0],
        (translation[1] - HEIGHT / 2) * zoom + HEIGHT / 2 + pan[1],
      ])
      .clipExtent([[0, 0], [WIDTH, HEIGHT]]);
  }, [groups, isGlobe, pan, rotation, zoom, WIDTH, HEIGHT]);
  const path = geoPath(projection);
  const groupByCode = new Map(groups.map((group) => [group.region.code, group]));

  const pins = groups.flatMap((group) => {
    const coordinates = group.region.coordinates;
    if (isGlobe && geoDistance(coordinates, [-rotation[0], -rotation[1]]) > Math.PI / 2 - 0.02) return [];
    const point = projection(coordinates);
    if (!point || !Number.isFinite(point[0] + point[1])) return [];
    return [{ code: group.region.code, name: group.region.name, x: point[0], y: point[1] }];
  });
  const markers = measured ? projectGeographyLabels(pins, labelLayout).filter(label =>
    label.left + label.width > 0 && label.left < WIDTH && label.top + label.height > 0 && label.top < HEIGHT) : [];
  const reveal = { opacity: reduceMotion || inView ? 1 : 0, scale: reduceMotion || inView ? 1 : .86 };

  function moveCamera(targetRotation: [number, number], targetZoom: number, targetPan: [number, number]) {
    cameraAnimation.current?.stop();
    const longitude = rotation[0] + ((targetRotation[0] - rotation[0]) % 360 + 540) % 360 - 180;
    const update = (t: number) => {
      setRotation([rotation[0] + (longitude - rotation[0]) * t, rotation[1] + (targetRotation[1] - rotation[1]) * t]);
      setZoom(zoom + (targetZoom - zoom) * t);
      setPan([pan[0] + (targetPan[0] - pan[0]) * t, pan[1] + (targetPan[1] - pan[1]) * t]);
    };
    if (reduceMotion) update(1);
    else cameraAnimation.current = animate(0, 1, { duration: .65, ease: [.22, 1, .36, 1], onUpdate: update });
  }

  function chooseRegion(group: OriginGroup) {
    setSelectedCode(group.region.code);
    const targetRotation: [number, number] = [-group.region.coordinates[0], -group.region.coordinates[1]];
    const base = isGlobe
      ? geoOrthographic().rotate(targetRotation).translate([WIDTH / 2, HEIGHT / 2]).scale(Math.min(WIDTH, HEIGHT) * .43)
      : regionalProjection(groups, WIDTH, HEIGHT);
    const country = countries.find(item => String(item.id) === group.region.code);
    let targetZoom = 2.5;
    if (country) {
      const [[x0, y0], [x1, y1]] = geoPath(base).bounds(mainPolygon(country));
      targetZoom = clamp(Math.min((WIDTH - 120) / Math.max(1, x1 - x0), (HEIGHT - 140) / Math.max(1, y1 - y0)), 1.5, MAX_ZOOM);
    }
    if (isGlobe) {
      moveCamera(targetRotation, targetZoom, [0, 0]);
    } else {
      const point = base(group.region.coordinates) ?? [WIDTH / 2, HEIGHT / 2];
      moveCamera(rotation, targetZoom, [(WIDTH / 2 - point[0]) * targetZoom, (HEIGHT / 2 - point[1]) * targetZoom - 16]);
    }
  }

  function resetView() {
    moveCamera(BASE_ROTATION, 1, [0, 0]);
    setSelectedCode(null);
  }

  function changeZoom(delta: number) {
    cameraAnimation.current?.stop();
    const nextZoom = clamp(zoom + delta, .75, MAX_ZOOM);
    setZoom(nextZoom);
    if (!isGlobe) setPan([pan[0] * nextZoom / zoom, pan[1] * nextZoom / zoom]);
  }

  function moveView(x: number, y: number) {
    cameraAnimation.current?.stop();
    if (isGlobe) setRotation(([lon, lat]) => [lon + x, clamp(lat + y, -80, 80)]);
    else setPan(([px, py]) => [clamp(px + x * 5, -WIDTH * zoom, WIDTH * zoom), clamp(py + y * 5, -HEIGHT * zoom, HEIGHT * zoom)]);
  }

  return (
    <section className="ornament-geography" aria-label="Ornament origins" data-testid="geography-view" data-mode={mode} data-zoom={zoom.toFixed(3)}>
      <div className="ornament-geo-layout">
        <div className="ornament-geo-atlas">
          <div className="ornament-geo-canvas" ref={canvasRef}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="ornament-geo-svg"
              role="group"
              aria-label={isGlobe ? "Interactive globe of ornament origins" : "Interactive map of ornament origins"}
              aria-describedby={`${id}-instructions`}
              tabIndex={0}
              data-testid="geography-surface"
              onKeyDown={(event) => {
                // A focused marker handles its own activation keys.
                if (event.target !== event.currentTarget) return;
                const moves: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
                if (moves[event.key]) { event.preventDefault(); moveView(...moves[event.key]); }
                if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(.25); }
                if (event.key === "-") { event.preventDefault(); changeZoom(-.25); }
                if (event.key === "Home") { event.preventDefault(); resetView(); }
              }}
              onPointerDown={(event) => {
                if (event.button !== 0 || (event.target as Element).closest('[role="button"]')) return;
                cameraAnimation.current?.stop();
                event.currentTarget.setPointerCapture(event.pointerId);
                suppressClick.current = false;
                drag.current = { x: event.clientX, y: event.clientY, rotation, pan, moved: false };
              }}
              onPointerMove={(event) => {
                const start = drag.current;
                if (!start) return;
                const scale = 1 / (event.currentTarget.getScreenCTM()?.a ?? 1);
                const dx = (event.clientX - start.x) * scale;
                const dy = (event.clientY - start.y) * scale;
                if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
                if (isGlobe) setRotation([start.rotation[0] + dx / 4, clamp(start.rotation[1] - dy / 4, -80, 80)]);
                else setPan([clamp(start.pan[0] + dx, -WIDTH * zoom, WIDTH * zoom), clamp(start.pan[1] + dy, -HEIGHT * zoom, HEIGHT * zoom)]);
              }}
              onPointerUp={(event) => {
                suppressClick.current = Boolean(drag.current?.moved);
                if (drag.current && !drag.current.moved) {
                  const matrix = event.currentTarget.getScreenCTM();
                  const local = matrix && new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
                  const point = local && projection.invert?.([local.x, local.y]);
                  // Floating labels provide keyboard-accessible country selection.
                  if (point) {
                    const nearest = groups.find((group) => geoDistance(point, group.region.coordinates) < 0.08);
                    if (nearest) chooseRegion(nearest);
                  }
                }
                drag.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { drag.current = null; }}
            >
              <title>{isGlobe ? "Globe" : "Map"} of regional ornament attributions</title>
              <defs>
                <clipPath id={`${id}-clip`}><rect width={WIDTH} height={HEIGHT} /></clipPath>
              </defs>
              <g clipPath={`url(#${id}-clip)`}>
                {isGlobe && <path d={path({ type: "Sphere" }) ?? ""} className="ornament-geo-sphere" />}
                <path d={path(graticule) ?? ""} className="ornament-geo-graticule" />
                {countries.map((country) => {
                  const code = String(country.id);
                  const group = groupByCode.get(code);
                  return (
                    <path
                      key={code}
                      d={path(country) ?? ""}
                      className={`ornament-geo-country${group ? " has-origins" : ""}${code === activeCode ? " is-active" : ""}`}
                      onClick={group ? () => { if (!suppressClick.current) chooseRegion(group); } : undefined}
                    >
                      <title>{country.properties?.name}{group ? `: ${group.items.length} specimens` : ""}</title>
                    </path>
                  );
                })}
                {markers.map((marker) => {
                  const line = geographyLabelConnector(marker);
                  return <g key={marker.code} className={`ornament-geo-pin${marker.code === activeCode ? " is-active" : ""}`} aria-hidden="true">
                    {line && <path data-testid={`map-connector-${marker.code}`} d={`M${line.x1},${line.y1} L${line.x2},${line.y2}`} />}
                    <circle data-testid={`map-pin-${marker.code}`} cx={marker.x} cy={marker.y} r={3} />
                  </g>;
                })}
              </g>
            </svg>
            <div className="ornament-geo-labels" data-testid="floating-region-labels">
              <AnimatePresence>
                {markers.map((marker, index) => {
                  const { code, left, top, width, height } = marker;
                  const line = geographyLabelConnector(marker);
                  const group = groupByCode.get(code)!;
                  return <motion.button
                    key={code}
                    type="button"
                    className={`ornament-geo-label${code === activeCode ? " is-active" : ""}${compact ? " is-compact" : ""}`}
                    style={{ left, top, width, height, transformOrigin: line ? `${line.x2 - left}px ${line.y2 - top}px` : "center" }}
                    aria-label={`${group.region.name}, ${group.items.length} specimens`}
                    aria-pressed={selectedCode === code}
                    data-testid={`map-marker-${code}`}
                    initial={reduceMotion ? false : { opacity: 0, scale: .86 }}
                    animate={reveal}
                    exit={{ opacity: 0, scale: reduceMotion ? 1 : .94, transition: { duration: reduceMotion ? 0 : .12 } }}
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 24, delay: index * .025 }}
                    whileTap={reduceMotion ? undefined : { scale: .97 }}
                    onClick={() => chooseRegion(group)}
                  >
                    <span className="ornament-geo-label-dot" aria-hidden="true" />
                    <span className="ornament-geo-label-name">{group.region.name}</span>
                    <span className="ornament-geo-label-count">{group.items.length}</span>
                  </motion.button>;
                })}
              </AnimatePresence>
            </div>
            {!groups.length && <p className="ornament-geo-empty">No verified regions in this selection.</p>}
            <motion.div className="ornament-geo-controls" role="group" aria-label="Geographic view controls"
              initial={reduceMotion ? false : { opacity: 0, scale: .94 }}
              animate={reveal}
              transition={{ duration: reduceMotion ? 0 : .3, ease: [.22, 1, .36, 1] }}>
              <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => changeZoom(.25)}>+</button>
              <button type="button" aria-label="Zoom out" disabled={zoom <= .75} onClick={() => changeZoom(-.25)}>−</button>
              <button type="button" className="ornament-geo-reset" onClick={resetView}>Reset</button>
            </motion.div>
            <a className="ornament-geo-credit" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>
            <span className="sr-only" id={`${id}-instructions`}>{isGlobe ? "Drag to rotate" : "Drag to pan"}. Arrow keys move the view, plus and minus zoom, and Home resets.</span>
          </div>
        </div>

      </div>
    </section>
  );
}
