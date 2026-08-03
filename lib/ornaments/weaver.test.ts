import assert from "node:assert/strict";
import test from "node:test";
import type { Motif, Source } from "./schema";
import { suggestProjectThreads } from "./weaver";

const source: Source = {
  id: "source-1",
  title: "A Manual of Historic Ornament",
  creator: "Richard Glazier",
  year: "1899",
  type: "book",
  era: "Victorian",
  region: null,
  url: "https://example.com",
  filePath: null,
  notionPageId: null,
  archivedAt: null,
  status: "digested",
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const motif: Motif = {
  id: "motif-1",
  sourceId: source.id,
  name: "Victorian floral wallpaper with gold vines",
  motifType: "floral",
  style: "Victorian Gothic",
  description: "A dense floral motif with climbing vines and gilded accents.",
  tags: ["floral", "wallpaper"],
  visualPrompt: "Sketch Victorian vines",
  applications: "Wallpaper, zines, and UI borders.",
  resonanceScore: 5,
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("project weaver returns unsaved candidate threads", () => {
  const suggestions = suggestProjectThreads([motif], [source], {
    desiredFormatTypes: ["zine"],
    limit: 1,
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].status, "idea");
  assert.deepEqual(suggestions[0].motifIds, [motif.id]);
  assert.deepEqual(suggestions[0].sourceIds, [source.id]);
  assert.deepEqual(suggestions[0].potentialFormats, ["zine"]);
});
