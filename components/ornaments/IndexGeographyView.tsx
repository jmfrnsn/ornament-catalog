"use client";

import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { animate, AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";

import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";
import { geographicDisplayMode, groupFigureOrigins, type OriginGroup } from "@/lib/ornaments/geography";
import { createGeographyLabelLayout, geographyLabelConnector, projectGeographyLabels } from "@/lib/ornaments/geography-labels";
import { geographyPinch, pinchGeographyCamera, rotateGeographyByPixels, type GeographyCamera, type GeographyPinch, type GeographyPoint } from "@/lib/ornaments/geography-camera";
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
type SafariGestureEvent = Event & { clientX: number; clientY: number; scale: number };

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
  const [camera, setCamera] = useState<GeographyCamera>({ rotation: BASE_ROTATION, zoom: 1, pan: [0, 0] });
  const { rotation, zoom, pan } = camera;
  // Synchronous snapshots keep sequential touch events from reading stale React state.
  const cameraRef = useRef(camera);
  function updateCamera(next: GeographyCamera) {
    cameraRef.current = next;
    setCamera(next);
  }
  const cameraAnimation = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => cameraAnimation.current?.stop(), []);
  const pointers = useRef(new Map<number, { point: GeographyPoint; target: Element }>());
  const drag = useRef<{ point: GeographyPoint; camera: GeographyCamera; radius: number; target: Element; moved: boolean } | null>(null);
  const pinch = useRef<{ camera: GeographyCamera; geometry: GeographyPinch } | null>(null);
  const safariPinch = useRef<{ camera: GeographyCamera; geometry: GeographyPinch } | null>(null);
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
        .translate([WIDTH / 2 + pan[0], HEIGHT / 2 + pan[1]])
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
    const start = cameraRef.current;
    const longitude = start.rotation[0] + ((targetRotation[0] - start.rotation[0]) % 360 + 540) % 360 - 180;
    const update = (t: number) => {
      updateCamera({
        rotation: [start.rotation[0] + (longitude - start.rotation[0]) * t, start.rotation[1] + (targetRotation[1] - start.rotation[1]) * t],
        zoom: start.zoom + (targetZoom - start.zoom) * t,
        pan: [start.pan[0] + (targetPan[0] - start.pan[0]) * t, start.pan[1] + (targetPan[1] - start.pan[1]) * t],
      });
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
    const current = cameraRef.current;
    const nextZoom = clamp(current.zoom + delta, .75, MAX_ZOOM);
    updateCamera({ ...current, zoom: nextZoom, pan: [current.pan[0] * nextZoom / current.zoom, current.pan[1] * nextZoom / current.zoom] });
  }

  function moveView(x: number, y: number) {
    cameraAnimation.current?.stop();
    const current = cameraRef.current;
    if (isGlobe) updateCamera({ ...current, rotation: rotateGeographyByPixels(current.rotation, x, y, projection.scale()) });
    else updateCamera({ ...current, pan: [clamp(current.pan[0] + x, -WIDTH * zoom, WIDTH * zoom), clamp(current.pan[1] + y, -HEIGHT * zoom, HEIGHT * zoom)] });
  }

  function localPoint(clientX: number, clientY: number): GeographyPoint {
    const box = canvasRef.current!.getBoundingClientRect();
    return [(clientX - box.left) * WIDTH / box.width, (clientY - box.top) * HEIGHT / box.height];
  }

  function beginGesture() {
    const active = [...pointers.current.values()];
    if (active.length >= 2) {
      pinch.current = { camera: cameraRef.current, geometry: geographyPinch(active[0].point, active[1].point) };
      drag.current = null;
      suppressClick.current = true;
    } else if (active.length === 1) {
      pinch.current = null;
      drag.current = { ...active[0], camera: cameraRef.current, radius: Math.min(WIDTH, HEIGHT) * .43 * cameraRef.current.zoom, moved: suppressClick.current };
    } else {
      pinch.current = null;
      drag.current = null;
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as Element).closest(".ornament-geo-controls, a")) return;
    cameraAnimation.current?.stop();
    safariPinch.current = null;
    if (!pointers.current.size) suppressClick.current = false;
    pointers.current.set(event.pointerId, { point: localPoint(event.clientX, event.clientY), target: event.target as Element });
    event.currentTarget.setPointerCapture(event.pointerId);
    beginGesture();
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointers.current.get(event.pointerId);
    if (!pointer) return;
    pointer.point = localPoint(event.clientX, event.clientY);
    if (pinch.current) {
      const active = [...pointers.current.values()];
      updateCamera(pinchGeographyCamera(pinch.current.camera, pinch.current.geometry, geographyPinch(active[0].point, active[1].point), [WIDTH / 2, HEIGHT / 2]));
    } else if (drag.current) {
      const start = drag.current;
      const dx = pointer.point[0] - start.point[0], dy = pointer.point[1] - start.point[1];
      if (Math.abs(dx) + Math.abs(dy) > 4) { start.moved = true; suppressClick.current = true; }
      if (isGlobe) updateCamera({ ...start.camera, rotation: rotateGeographyByPixels(start.camera.rotation, dx, dy, start.radius) });
      else updateCamera({ ...start.camera, pan: [clamp(start.camera.pan[0] + dx, -WIDTH * zoom, WIDTH * zoom), clamp(start.camera.pan[1] + dy, -HEIGHT * zoom, HEIGHT * zoom)] });
    }
  }

  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    const start = drag.current;
    if (cancelled) suppressClick.current = true;
    if (!cancelled && start && !start.moved && !suppressClick.current && pointers.current.size === 1) {
      const code = start.target.closest<HTMLElement>("[data-region-code]")?.dataset.regionCode;
      const point = projection.invert?.(localPoint(event.clientX, event.clientY));
      const group = groups.find(group => code ? group.region.code === code : point && geoDistance(point, group.region.coordinates) < .08);
      if (group) chooseRegion(group);
    }
    pointers.current.delete(event.pointerId);
    // Rebase at the current camera before resuming a one-finger drag or changing fingers.
    beginGesture();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const wheelGesture = useEffectEvent((event: WheelEvent) => {
    if (!event.ctrlKey) return; // Ordinary scrolling still scrolls the page.
    event.preventDefault();
    if (safariPinch.current || pointers.current.size) return;
    cameraAnimation.current?.stop();
    const point = localPoint(event.clientX, event.clientY);
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? HEIGHT : 1;
    const factor = Math.exp(clamp(-event.deltaY * unit * .01, -1, 1));
    updateCamera(pinchGeographyCamera(cameraRef.current, { midpoint: point, distance: 1 }, { midpoint: point, distance: factor }, [WIDTH / 2, HEIGHT / 2]));
  });
  const safariGesture = useEffectEvent((raw: Event) => {
    const event = raw as SafariGestureEvent;
    event.preventDefault();
    if (pointers.current.size) return; // Do not process iOS touch pinches twice.
    const point = event.clientX || event.clientY ? localPoint(event.clientX, event.clientY) : [WIDTH / 2, HEIGHT / 2] as GeographyPoint;
    if (event.type === "gesturestart") {
      cameraAnimation.current?.stop();
      safariPinch.current = { camera: cameraRef.current, geometry: { midpoint: point, distance: event.scale || 1 } };
    } else if (event.type === "gesturechange" && safariPinch.current) {
      updateCamera(pinchGeographyCamera(safariPinch.current.camera, safariPinch.current.geometry, { midpoint: point, distance: event.scale }, [WIDTH / 2, HEIGHT / 2]));
    } else if (event.type === "gestureend") safariPinch.current = null;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", wheelGesture, { passive: false });
    for (const name of ["gesturestart", "gesturechange", "gestureend"]) canvas.addEventListener(name, safariGesture, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", wheelGesture);
      for (const name of ["gesturestart", "gesturechange", "gestureend"]) canvas.removeEventListener(name, safariGesture);
    };
  }, []);

  return (
    <section className="ornament-geography" aria-label="Ornament origins" data-testid="geography-view" data-mode={mode} data-zoom={zoom.toFixed(3)}>
      <div className="ornament-geo-layout">
        <div className="ornament-geo-atlas">
          <div className="ornament-geo-canvas" ref={canvasRef}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd}
            onPointerCancel={event => pointerEnd(event, true)}
            onLostPointerCapture={event => { if (event.target === event.currentTarget) pointerEnd(event, true); }}>
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
                const moves: Record<string, [number, number]> = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] };
                if (moves[event.key]) { event.preventDefault(); moveView(...moves[event.key]); }
                if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(.25); }
                if (event.key === "-") { event.preventDefault(); changeZoom(-.25); }
                if (event.key === "Home") { event.preventDefault(); resetView(); }
              }}
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
                      data-region-code={group ? code : undefined}
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
                    data-region-code={code}
                    initial={reduceMotion ? false : { opacity: 0, scale: .86 }}
                    animate={reveal}
                    exit={{ opacity: 0, scale: reduceMotion ? 1 : .94, transition: { duration: reduceMotion ? 0 : .12 } }}
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 24, delay: index * .025 }}
                    whileTap={reduceMotion ? undefined : { scale: .97 }}
                    onClick={event => { if (event.detail === 0 || !suppressClick.current) chooseRegion(group); }}
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
            <span className="sr-only" id={`${id}-instructions`}>{isGlobe ? "Drag to rotate" : "Drag to pan"}. Pinch with two fingers to zoom. Arrow keys move the view, plus and minus zoom, and Home resets.</span>
          </div>
        </div>

      </div>
    </section>
  );
}
