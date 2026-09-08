"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";

import { ArchiveSourceButton } from "./ArchiveSourceButton";
import { OrnamentImage } from "./OrnamentImage";
import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";
import { geographicDisplayMode, groupFigureOrigins, type OriginGroup } from "@/lib/ornaments/geography";
import "./geography.css";

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = feature(topology, topology.objects.countries).features;
const graticule = geoGraticule10();
const BASE_ROTATION: [number, number] = [-50, -30];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Props = {
  figures: OrnamentFigure[];
  isAdmin: boolean;
  onArchiveChange: (sourceId: string, archived: boolean) => void;
  embed?: boolean;
};

function mainPolygon(country: Feature<Geometry>) {
  if (country.geometry.type !== "MultiPolygon") return country;
  // Drop overseas islands when fitting a regional viewport, not when drawing.
  const polygons = country.geometry.coordinates;
  const largest = [...polygons].sort((a, b) => b[0].length - a[0].length)[0];
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: largest } } as Feature<Geometry>;
}

export function IndexGeographyView(props: Props) {
  const origins = useMemo(() => groupFigureOrigins(props.figures), [props.figures]);
  const mode = geographicDisplayMode(origins.groups);
  // Reset navigation when the era/archival selection changes.
  const selectionKey = props.figures.map((figure) => figure.source.id).join("|");
  return <GeographyPanel key={selectionKey} {...props} {...origins} mode={mode} />;
}

function GeographyPanel({
  figures, groups, unplaced, mode, isAdmin, onArchiveChange, embed = false,
}: Props & ReturnType<typeof groupFigureOrigins> & { mode: "globe" | "map" }) {
  const id = useId();
  const [compact, setCompact] = useState(false);
  const WIDTH = compact ? 420 : 840;
  const HEIGHT = compact ? 420 : 580;
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rotation, setRotation] = useState<[number, number]>(BASE_ROTATION);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const drag = useRef<{ x: number; y: number; rotation: [number, number]; pan: [number, number]; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 600));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const isGlobe = mode === "globe";
  const selectedGroup = groups.find((group) => group.region.code === selectedCode);
  const shownItems = selectedCode === "unplaced"
    ? unplaced
    : selectedGroup?.items ?? groups.flatMap((group) => group.items).concat(unplaced);
  const active = shownItems.find((item) => item.figure.source.id === activeId);
  const activeCode = active?.region?.code ?? selectedGroup?.region.code;
  const displayCountry = selectedCode === "unplaced" ? "Unplaced" : selectedGroup?.region.name ?? "All regions";
  const sourceHref = (sourceId: string) => `/sources/${sourceId}${embed ? "?embed=1" : ""}`;

  const projection = useMemo(() => {
    if (isGlobe) {
      return geoOrthographic()
        .rotate([rotation[0], rotation[1], 0])
        .translate([WIDTH / 2, HEIGHT / 2])
        .scale((compact ? 164 : 242) * zoom)
        .clipExtent([[0, 0], [WIDTH, HEIGHT]]);
    }
    const codes = new Set(groups.map((group) => group.region.code));
    const regionalCountries = countries.filter((country) => codes.has(String(country.id))).map(mainPolygon);
    const map = geoMercator();
    if (regionalCountries.length) {
      map.fitExtent(
        compact ? [[35, 50], [WIDTH - 70, HEIGHT - 55]] : [[100, 80], [WIDTH - 130, HEIGHT - 80]],
        { type: "FeatureCollection", features: regionalCountries },
      );
    } else {
      map.center([10, 46]).scale(480).translate([WIDTH / 2, HEIGHT / 2]);
    }
    const translation = map.translate();
    return map
      .scale(map.scale() * zoom)
      .translate([
        (translation[0] - WIDTH / 2) * zoom + WIDTH / 2 + pan[0],
        (translation[1] - HEIGHT / 2) * zoom + HEIGHT / 2 + pan[1],
      ])
      .clipExtent([[0, 0], [WIDTH, HEIGHT]]);
  }, [groups, isGlobe, pan, rotation, zoom, compact, WIDTH, HEIGHT]);
  const path = geoPath(projection);
  const groupByCode = new Map(groups.map((group) => [group.region.code, group]));

  // Count markers have leader lines and separate labels even in dense Europe.
  const markers = groups.flatMap((group) => {
    const coordinates = group.region.coordinates;
    if (isGlobe && geoDistance(coordinates, [-rotation[0], -rotation[1]]) > Math.PI / 2 - 0.02) return [];
    const point = projection(coordinates);
    if (!point || point[0] < 10 || point[0] > WIDTH - 55 || point[1] < 10 || point[1] > HEIGHT - 25) return [];
    return [{ group, x: point[0], y: point[1], labelY: point[1] }];
  }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < markers.length; i++) {
    const nearby = markers.slice(0, i).filter((marker) => Math.abs(marker.x - markers[i].x) < 85);
    for (const previous of nearby) markers[i].labelY = Math.max(markers[i].labelY, previous.labelY + 34);
  }

  function chooseRegion(group: OriginGroup) {
    setSelectedCode(group.region.code);
    setActiveId(group.items[0]?.figure.source.id ?? null);
    if (isGlobe) {
      setRotation([-group.region.coordinates[0], -group.region.coordinates[1]]);
      setZoom(1);
    }
  }

  function resetView() {
    setRotation(BASE_ROTATION);
    setZoom(1);
    setPan([0, 0]);
    setSelectedCode(null);
    setActiveId(null);
  }

  function moveView(x: number, y: number) {
    if (isGlobe) setRotation(([lon, lat]) => [lon + x, clamp(lat + y, -80, 80)]);
    else setPan(([px, py]) => [clamp(px + x * 5, -WIDTH * zoom, WIDTH * zoom), clamp(py + y * 5, -HEIGHT * zoom, HEIGHT * zoom)]);
  }

  return (
    <section className="ornament-geography" aria-label="Ornament origins" data-testid="geography-view" data-mode={mode}>
      <div className="ornament-geo-layout">
        <div className="ornament-geo-atlas">
          <div className="ornament-geo-canvas">
            <svg
              ref={svgRef}
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
                if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom((value) => clamp(value + 0.25, 0.75, 2.5)); }
                if (event.key === "-") { event.preventDefault(); setZoom((value) => clamp(value - 0.25, 0.75, 2.5)); }
                if (event.key === "Home") { event.preventDefault(); resetView(); }
              }}
              onPointerDown={(event) => {
                if (event.button !== 0 || (event.target as Element).closest('[role="button"]')) return;
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
                  // Country selection is also available from the accessible region list.
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
                {markers.map(({ group, x, y, labelY }) => (
                  <g
                    key={group.region.code}
                    className={`ornament-geo-marker${group.region.code === activeCode ? " is-active" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${group.region.name}, ${group.items.length} specimens`}
                    aria-pressed={selectedCode === group.region.code}
                    data-testid={`map-marker-${group.region.code}`}
                    onClick={() => chooseRegion(group)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseRegion(group); }
                    }}
                  >
                    <path d={`M${x},${y} L${x + 25},${labelY} H${x + 42}`} />
                    <circle cx={x} cy={y} r={3.5} />
                    <rect x={x + 30} y={labelY - 22} width={44} height={44} fill="transparent" stroke="none" />
                    <circle className="ornament-geo-count" cx={x + 52} cy={labelY} r={13} />
                    <text x={x + 52} y={labelY} dy=".35em" textAnchor="middle">{group.items.length}</text>
                    {!compact && <text className="ornament-geo-place-name" x={x + 74} y={labelY} dy=".35em">{group.region.name}</text>}
                    <title>{group.region.name}: {group.items.length} specimens</title>
                  </g>
                ))}
              </g>
            </svg>
            {!groups.length && <p className="ornament-geo-empty">No verified regions in this selection.<br />Explore the unplaced specimens alongside.</p>}
            <div className="ornament-geo-controls" role="group" aria-label="Geographic view controls">
              <button type="button" aria-label="Zoom in" disabled={zoom >= 2.5} onClick={() => setZoom((value) => clamp(value + 0.25, 0.75, 2.5))}>+</button>
              <button type="button" aria-label="Zoom out" disabled={zoom <= 0.75} onClick={() => setZoom((value) => clamp(value - 0.25, 0.75, 2.5))}>−</button>
              <button type="button" className="ornament-geo-reset" onClick={resetView}>Reset</button>
            </div>
            <span className="ornament-geo-projection">{isGlobe ? "Orthographic globe" : "Mercator map"}</span>
          </div>
          <div className="ornament-geo-atlas-foot">
            <p id={`${id}-instructions`}>{isGlobe ? "Drag to rotate" : "Drag to pan"} · Select a region to explore<br />Keyboard: arrows to move, + / − to zoom, Home to reset</p>
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>
          </div>
        </div>

        <aside className="ornament-geo-sidebar" aria-label="Specimens by origin" data-testid="geography-sidebar">
          <div className="ornament-geo-region-list" role="group" aria-label="Select origin region">
            <button type="button" aria-pressed={selectedCode === null} onClick={() => { setSelectedCode(null); setActiveId(null); }}>
              <span>All regions</span><span>{figures.length}</span>
            </button>
            {groups.map((group) => (
              <button key={group.region.code} type="button" aria-pressed={selectedCode === group.region.code} data-testid={`select-region-${group.region.code}`} onClick={() => chooseRegion(group)}>
                <span>{group.region.name}</span><span>{group.items.length}</span>
              </button>
            ))}
            {unplaced.length > 0 && (
              <button type="button" aria-pressed={selectedCode === "unplaced"} onClick={() => { setSelectedCode("unplaced"); setActiveId(null); }}>
                <span>Unplaced</span><span>{unplaced.length}</span>
              </button>
            )}
          </div>

          <div className="ornament-geo-specimens" role="group" aria-label={`${displayCountry} specimens`} aria-describedby={`${id}-attribution`}>
            {shownItems.map(({ figure, region, attribution }) => (
              <article key={figure.source.id} className="ornament-geo-specimen">
                <Link
                  href={sourceHref(figure.source.id)}
                  className="ornament-geo-specimen-link"
                  data-testid={`open-specimen-${figure.source.id}`}
                  aria-label={`Open ${figure.source.title}`}
                  title={attribution?.note ?? "No supported regional attribution is available."}
                  onMouseEnter={() => setActiveId(figure.source.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(figure.source.id)}
                  onBlur={() => setActiveId(null)}
                >
                  <span className="ornament-geo-thumb">
                    {figure.source.imageUrl ? <OrnamentImage src={figure.source.imageUrl} alt="" fill sizes="(max-width: 700px) 40vw, 17vw" className="object-contain" /> : <span className="ornament-geo-no-image">Image unavailable</span>}
                  </span>
                  <span className="ornament-geo-item-title">{figure.titleLabel}</span>
                  <span className="ornament-geo-item-region">{region?.name ?? "Unplaced"} · {figure.source.year}</span>
                </Link>
                {isAdmin && <div className="ornament-geo-archive"><ArchiveSourceButton sourceId={figure.source.id} archived={figure.source.notionStatus === "Archived"} onCompleted={(archived) => onArchiveChange(figure.source.id, archived)} /></div>}
              </article>
            ))}
          </div>
          {!shownItems.length && <p className="ornament-geo-no-results">No specimens in this selection.</p>}
        </aside>
      </div>
      <p className="ornament-geo-disclaimer" id={`${id}-attribution`}>Locations show regional or artist-nationality attributions, not confirmed creation sites. Hover a specimen for its attribution note; modern borders are for orientation only.</p>
    </section>
  );
}
