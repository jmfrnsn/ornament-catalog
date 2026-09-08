import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../../data/ornaments/sources.json";
import attributions from "../../data/ornaments/origins.json";
import { toOrnamentFigures } from "./figure-catalog";
import { geographicDisplayMode, groupFigureOrigins, locateFigure } from "./geography";
import type { ExportedOrnamentSource } from "./sources-export";

const sources = snapshot.sources as ExportedOrnamentSource[];
const active = toOrnamentFigures(sources.filter((source) => source.notionStatus === "Active"));

test("all currently active specimens have supported, source-linked regional attributions", () => {
  const { groups, unplaced } = groupFigureOrigins(active);
  assert.equal(unplaced.length, 0);
  assert.equal(groups.reduce((total, group) => total + group.items.length, 0), active.length);
  assert.equal(groups.length, 6);
  for (const figure of active) {
    const item = locateFigure(figure);
    assert.ok(item.attribution?.evidenceUrl.startsWith("https://"));
    assert.ok(item.attribution?.basis);
    assert.ok(item.attribution?.note);
  }
});

test("a global selection uses a globe; Europe-only eras use a map", () => {
  const { groups } = groupFigureOrigins(active);
  assert.equal(geographicDisplayMode(groups), "globe");
  assert.equal(geographicDisplayMode(groups.filter((group) => group.region.code !== "156")), "map");
  assert.equal(geographicDisplayMode(groups.slice(0, 1)), "map");
  assert.equal(geographicDisplayMode([]), "map");
  const renaissance = active.filter((figure) => /renaissance/i.test(figure.source.era));
  assert.ok(renaissance.length > 0);
  assert.equal(geographicDisplayMode(groupFigureOrigins(renaissance).groups), "map");
});

test("Lamqua is associated with China, never the holding museum in New York", () => {
  const item = locateFigure(active.find((figure) => figure.source.creator === "Lamqua")!);
  assert.equal(item.region?.name, "China");
  assert.equal(item.attribution?.basis, "artist nationality only");
});

test("unknown origins remain visible and are not inferred from artist names or subjects", () => {
  const unknown = {
    ...active[0],
    source: { ...active[0].source, id: "new-record", region: null, creator: "Anonymous, Italian", title: "Palace at Rome", type: "The Met" },
  };
  assert.equal(locateFigure(unknown).region, null);
  const result = groupFigureOrigins([...active, unknown]);
  assert.equal(result.unplaced[0].figure.source.id, "new-record");
  assert.equal(result.groups.flatMap((group) => group.items).length + result.unplaced.length, active.length + 1);
});

test("explicit catalog aliases normalize conservatively", () => {
  for (const raw of ["French", " France ", "FRENCH"]) {
    const figure = { ...active[0], source: { ...active[0].source, id: "new-record", region: raw } };
    assert.equal(locateFigure(figure).region?.name, "France");
    assert.equal(locateFigure(figure).attribution?.basis, "Catalog region");
  }
  const ambiguous = { ...active[0], source: { ...active[0].source, id: "ambiguous", region: "French or Italian" } };
  assert.equal(locateFigure(ambiguous).region, null);
});

test("research IDs are unique and correspond to real specimens", () => {
  assert.equal(new Set(attributions.map((entry) => entry.id)).size, attributions.length);
  assert.ok(attributions.every((entry) => sources.some((source) => source.id === entry.id)));
});

test("empty, single-region, filtered, and archived selections retain correct counts", () => {
  assert.deepEqual(groupFigureOrigins([]), { groups: [], unplaced: [] });
  for (const era of new Set(active.map((figure) => figure.source.era))) {
    const selection = active.filter((figure) => figure.source.era === era);
    const result = groupFigureOrigins(selection);
    assert.equal(result.groups.flatMap((group) => group.items).length + result.unplaced.length, selection.length);
  }
  const archived = toOrnamentFigures(sources.filter((source) => source.notionStatus === "Archived"));
  const result = groupFigureOrigins(archived);
  assert.equal(result.groups.flatMap((group) => group.items).length + result.unplaced.length, archived.length);
});
