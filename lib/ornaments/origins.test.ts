import assert from "node:assert/strict";
import test from "node:test";

import { geoEquirectangular } from "d3-geo";
import {
  originFitGeometry,
  resolveOrnamentOrigin,
} from "./origins";
import { listExportedSources } from "./sources-export";
import type { ExportedOrnamentSource } from "./sources-export";

function stubSource(
  overrides: Partial<ExportedOrnamentSource>,
): ExportedOrnamentSource {
  return {
    id: "id",
    notionPageId: null,
    title: "Title",
    creator: "Maker",
    year: "1900",
    type: "The Met",
    era: "Baroque (17th c.)",
    region: null,
    url: null,
    imageUrl: null,
    status: "to_read",
    notionStatus: "Active",
    archivedAt: null,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("region parentheticals resolve to a city", () => {
  const origin = resolveOrnamentOrigin(
    stubSource({ region: "Italian (Florence)" }),
  );
  assert.equal(origin?.place, "Florence");
  assert.equal(origin?.precision, "city");
});

test("nationality regions resolve to a country", () => {
  const origin = resolveOrnamentOrigin(stubSource({ region: "French" }));
  assert.equal(origin?.place, "France");
  assert.equal(origin?.precision, "country");
});

test("anonymous creator demonyms fill in missing regions", () => {
  const origin = resolveOrnamentOrigin(
    stubSource({
      region: null,
      creator: "Anonymous, Italian, 16th century",
    }),
  );
  assert.equal(origin?.place, "Italy");
});

test("florentine makers win over a generic italian demonym", () => {
  const origin = resolveOrnamentOrigin(
    stubSource({
      region: null,
      creator: "Anonymous, Italian, Florentine, 16th century",
    }),
  );
  assert.equal(origin?.place, "Florence");
});

test("title sites take priority over the artist workshop", () => {
  const origin = resolveOrnamentOrigin(
    stubSource({
      title:
        "Leaf from Aedes Walpolianae mounted with two drawings: Salon Chimney, Houghton Hall, Norfolk",
      creator: "Isaac Ware",
      region: null,
    }),
  );
  assert.equal(origin?.place, "Houghton Hall");
  assert.equal(origin?.precision, "site");
});

test("known artists resolve when region is missing", () => {
  const mucha = resolveOrnamentOrigin(
    stubSource({ creator: "Alphonse Mucha", region: "Czech" }),
  );
  assert.equal(mucha?.place, "Prague");

  const lamqua = resolveOrnamentOrigin(
    stubSource({
      title: "Design for a Hall Lamp",
      creator: "Lamqua",
      region: null,
    }),
  );
  assert.equal(lamqua?.place, "Guangzhou");
});

test("harewood and ludwigsburg titles resolve to the depicted site", () => {
  const harewood = resolveOrnamentOrigin(
    stubSource({
      title:
        "Design for a Chimney Piece in the Gallery, now Dining Room, Harewood House, Yorkshire (Elevation)",
      creator: "Robert Adam",
      region: null,
    }),
  );
  assert.equal(harewood?.place, "Harewood House");

  const favorita = resolveOrnamentOrigin(
    stubSource({
      title:
        "Design for the Salon of the Pleasure Pavilion, Favorita, at Ludwigsburg, 1718",
      creator: "Donato Giuseppe Frisoni",
      region: null,
    }),
  );
  assert.equal(favorita?.place, "Ludwigsburg");
});

test("every catalog source resolves to an origin", () => {
  const sources = listExportedSources({ view: "all" });
  assert.ok(sources.length > 0);

  const missing = sources.filter((source) => !resolveOrnamentOrigin(source));
  assert.deepEqual(
    missing.map((source) => `${source.creator} — ${source.title}`),
    [],
  );
});

test("regional map fit zooms to the selection instead of the world", () => {
  const france = resolveOrnamentOrigin(stubSource({ region: "French" }));
  const naples = resolveOrnamentOrigin(
    stubSource({ creator: "Giovanni Andrea Maglioli", region: null }),
  );
  assert.ok(france && naples);

  const geometry = originFitGeometry([france, naples]);
  const lngs = geometry.coordinates.map((point) => point[0]);
  const span = Math.max(...lngs) - Math.min(...lngs);
  assert.ok(span < 80, `expected a regional lng span, got ${span}`);

  const fitted = geoEquirectangular().fitExtent(
    [
      [48, 40],
      [1152, 504],
    ],
    geometry,
  );
  const world = geoEquirectangular().fitExtent(
    [
      [48, 40],
      [1152, 504],
    ],
    { type: "Sphere" },
  );
  assert.ok(
    fitted.scale() > world.scale() * 3,
    `expected a zoomed map (fitted ${fitted.scale()} vs world ${world.scale()})`,
  );
});
