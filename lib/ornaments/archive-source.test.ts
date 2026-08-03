import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, NotFoundError } from "./errors";
import { listExportedSources } from "./sources-export";

test("archiveCatalogSource rejects missing and already-archived sources", async () => {
  const { archiveCatalogSource } = await import("./archive-source");

  await assert.rejects(
    () => archiveCatalogSource("missing-source-id"),
    (error: unknown) => error instanceof NotFoundError,
  );

  const archived = listExportedSources({ view: "archived" })[0];
  assert.ok(archived);

  await assert.rejects(
    () => archiveCatalogSource(archived.id),
    (error: unknown) =>
      error instanceof ApiError && error.code === "ALREADY_ARCHIVED",
  );
});

test("unarchiveCatalogSource rejects active sources", async () => {
  const { unarchiveCatalogSource } = await import("./archive-source");
  const active = listExportedSources({ view: "active" })[0];
  assert.ok(active);

  await assert.rejects(
    () => unarchiveCatalogSource(active.id),
    (error: unknown) =>
      error instanceof ApiError && error.code === "NOT_ARCHIVED",
  );
});
