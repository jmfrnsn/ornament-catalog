import assert from "node:assert/strict";
import test from "node:test";
import { notionPageToSourceInput } from "./notion-sync";

test("notion page mapper creates source input", () => {
  const input = notionPageToSourceInput({
    id: "page-1",
    url: "https://notion.so/page-1",
    cover: {
      type: "external",
      external: { url: "https://images.example.com/ornament.jpg" },
    },
    properties: {
      Name: {
        type: "title",
        title: [{ plain_text: "Historical Ornament Plate" }],
      },
      Maker: {
        type: "rich_text",
        rich_text: [{ plain_text: "Unknown engraver" }],
      },
      Date: {
        type: "number",
        number: 1899,
      },
      Source: {
        type: "select",
        select: { name: "book" },
      },
      Era: {
        type: "select",
        select: { name: "Victorian" },
      },
      Notes: {
        type: "rich_text",
        rich_text: [{ plain_text: "Floral border with architectural frame." }],
      },
    },
  });

  assert.equal(input.title, "Historical Ornament Plate");
  assert.equal(input.creator, "Unknown engraver");
  assert.equal(input.year, "1899");
  assert.equal(input.url, "https://notion.so/page-1");
  assert.equal(input.filePath, "https://images.example.com/ornament.jpg");
  assert.equal(input.notionPageId, "page-1");
});

test("notion page mapper marks archived status locally", () => {
  const input = notionPageToSourceInput({
    id: "page-2",
    url: "https://notion.so/page-2",
    properties: {
      Name: {
        type: "title",
        title: [{ plain_text: "Archived Ornament Plate" }],
      },
      Object: {
        type: "url",
        url: "https://example.com/object",
      },
      Status: {
        type: "select",
        select: { name: "Archived" },
      },
    },
  });

  assert.equal(input.status, "to_read");
  assert.equal(typeof input.archivedAt, "string");
});
