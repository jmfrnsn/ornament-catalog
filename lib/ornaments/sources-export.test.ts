import assert from "node:assert/strict";
import test from "node:test";

import {
  getExportedSource,
  listExportedSources,
  loadOrnamentSourcesExport,
} from "./sources-export";

test("ornament sources export loads with expected counts", () => {
  const snapshot = loadOrnamentSourcesExport();
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.counts.total, snapshot.sources.length);
  assert.equal(
    snapshot.counts.active,
    snapshot.sources.filter((source) => source.notionStatus === "Active")
      .length,
  );
  assert.equal(
    snapshot.counts.archived,
    snapshot.sources.filter((source) => source.notionStatus === "Archived")
      .length,
  );
});

test("listExportedSources defaults to active sources", () => {
  const active = listExportedSources();
  assert.ok(active.length > 0);
  assert.ok(active.every((source) => source.notionStatus === "Active"));
});

test("getExportedSource returns a known source by id", () => {
  const first = listExportedSources({ view: "all" })[0];
  assert.ok(first);
  const found = getExportedSource(first.id);
  assert.equal(found?.title, first.title);
});
