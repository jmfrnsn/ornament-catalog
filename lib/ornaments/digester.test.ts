import assert from "node:assert/strict";
import test from "node:test";
import { digestSource } from "./digester";
import type { Source } from "./schema";

const source: Source = {
  id: "source-1",
  title: "Victorian Facade Notes",
  creator: "Field notebook",
  year: "1890",
  type: "facade_photo",
  era: "Victorian",
  region: "San Francisco",
  url: "https://example.com/facade",
  filePath: null,
  notionPageId: null,
  archivedAt: null,
  status: "to_read",
  notes: "Cornice, vine, and flower details.",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("fallback digester returns dry-run motif candidates", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await digestSource(source, { dryRun: true });

  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }

  assert.equal(result.saved, false);
  assert.equal(result.motifs.length, 1);
  assert.equal(result.motifs[0].sourceId, source.id);
  assert.equal(result.motifs[0].resonanceScore, 3);
});
