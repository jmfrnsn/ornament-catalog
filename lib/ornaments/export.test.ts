import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resetDbForTests } from "./db";
import { writeOrnamentSourcesExport } from "./export";
import { createSource } from "./repository";

test("ornament export is deterministic across writes", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ornament-export-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const exportPath = path.join(tempDir, "sources.json");

  process.env.ORNAMENT_DB_PATH = databasePath;
  resetDbForTests();

  await createSource({
    title: "Ornament Plate A",
    creator: "Anonymous",
    year: "1899",
    type: "The Met",
    era: "Victorian",
    region: "England",
    url: "https://example.com/a",
    filePath: "https://images.example.com/a.jpg",
    notionPageId: "page-a",
    status: "to_read",
    notes: "Border study",
  });

  await createSource({
    title: "Ornament Plate B",
    creator: "Anonymous",
    year: "1901",
    type: "The Met",
    era: "Victorian",
    url: "https://example.com/b",
    filePath: "https://images.example.com/b.jpg",
    notionPageId: "page-b",
    status: "to_read",
    notes: "",
    archivedAt: "2026-07-17T00:00:00.000Z",
  });

  const first = await writeOrnamentSourcesExport(exportPath);
  const firstContents = fs.readFileSync(exportPath, "utf8");
  const second = await writeOrnamentSourcesExport(exportPath);
  const secondContents = fs.readFileSync(exportPath, "utf8");

  assert.equal(first.snapshot.schemaVersion, 1);
  assert.equal(first.snapshot.counts.total, 2);
  assert.equal(first.snapshot.counts.active, 1);
  assert.equal(first.snapshot.counts.archived, 1);
  assert.equal(first.snapshot.sources[0].notionPageId, "page-a");
  assert.equal(first.snapshot.sources[1].notionStatus, "Archived");
  assert.equal(firstContents, secondContents);
  assert.deepEqual(first.snapshot, second.snapshot);

  resetDbForTests();
  delete process.env.ORNAMENT_DB_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});
