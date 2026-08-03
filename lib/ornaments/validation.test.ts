import assert from "node:assert/strict";
import test from "node:test";
import { sourceCreateSchema } from "./validation";

test("source validation requires a url or file path", () => {
  const result = sourceCreateSchema.safeParse({
    title: "A Manual of Historic Ornament",
    creator: "Richard Glazier",
    year: 1899,
    type: "book",
    era: "Victorian",
    status: "to_read",
  });

  assert.equal(result.success, false);
});

test("source validation normalizes numeric years", () => {
  const result = sourceCreateSchema.parse({
    title: "Whole Earth Catalog",
    creator: "Stewart Brand",
    year: 1968,
    type: "catalog_issue",
    era: "Whole Earth",
    url: "https://example.com",
  });

  assert.equal(result.year, "1968");
  assert.equal(result.status, "to_read");
});
