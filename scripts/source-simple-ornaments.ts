import { loadEnvConfig } from "@next/env";
import { Client } from "@notionhq/client";

loadEnvConfig(process.cwd());

type Candidate = {
  title: string;
  maker: string;
  date: string;
  era: string;
  culture?: string;
  source: "Art Institute of Chicago" | "Cleveland Museum of Art";
  objectUrl: string;
  imageUrl: string;
};

const CANDIDATES: Candidate[] = [
  {
    title: "Ornament",
    maker: "Alphonse Mucha",
    date: "1901–2",
    era: "Modern (20th c.+)",
    culture: "Czech",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1992.35",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1992.35/1992.35_web.jpg",
  },
  {
    title: "Floral Designs with Two Birds",
    maker: "Giacomo Cavenezia",
    date: "1774",
    era: "Rococo & Neoclassical (18th c.)",
    culture: "Italian",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1952.289",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1952.289/1952.289_web.jpg",
  },
  {
    title: "Floral Designs with a Blue Bird",
    maker: "Giacomo Cavenezia",
    date: "c. 1773/74",
    era: "Rococo & Neoclassical (18th c.)",
    culture: "Italian",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1952.287",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1952.287/1952.287_web.jpg",
  },
  {
    title: "Floral Designs and Floral Bands",
    maker: "Giacomo Cavenezia",
    date: "1784",
    era: "Rococo & Neoclassical (18th c.)",
    culture: "Italian",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1952.291",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1952.291/1952.291_web.jpg",
  },
  {
    title: "Flower Study",
    maker: "Harry Fenn",
    date: "c. 1857–1911",
    era: "19th-Century Revival & Historicism",
    culture: "American",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1928.120",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1928.120/1928.120_web.jpg",
  },
  {
    title: "Flower Embroidery Design for Silk Manufactory of Lyon",
    maker: "Jean Baptiste Pillement",
    date: "c. 1790",
    era: "Rococo & Neoclassical (18th c.)",
    culture: "French",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/2019.67",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/2019.67/2019.67_web.jpg",
  },
  {
    title: "Spray of Flowers",
    maker: "L. F. Duruisseau",
    date: "c. 1774–1800",
    era: "Rococo & Neoclassical (18th c.)",
    culture: "French",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1955.475",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1955.475/1955.475_web.jpg",
  },
  {
    title:
      "New Suite of Portfolios of Flowers Ideal to Use for Designing and Painting: Floral Fantasies",
    maker: "Anne Allen",
    date: "c. 1796",
    era: "Rococo & Neoclassical (18th c.)",
    culture: "British",
    source: "Cleveland Museum of Art",
    objectUrl: "https://www.clevelandart.org/art/1968.38",
    imageUrl:
      "https://openaccess-cdn.clevelandart.org/1968.38/1968.38_web.jpg",
  },
  {
    title: "Sketches of Snails, Flowering Plant",
    maker: "Édouard Manet",
    date: "1864/68",
    era: "19th-Century Revival & Historicism",
    culture: "French",
    source: "Art Institute of Chicago",
    objectUrl: "https://www.artic.edu/artworks/9485",
    imageUrl:
      "https://www.artic.edu/iiif/2/a80f8ca3-3d35-fef0-bd1a-a774519b09da/full/843,/0/default.jpg",
  },
  {
    title: "Bell-Flower and Dragonfly, from an untitled series of large flowers",
    maker: "Katsushika Hokusai",
    date: "c. 1833/34",
    era: "19th-Century Revival & Historicism",
    culture: "Japanese",
    source: "Art Institute of Chicago",
    objectUrl: "https://www.artic.edu/artworks/25129",
    imageUrl:
      "https://www.artic.edu/iiif/2/960360f3-def7-27e5-6102-6fea8815ff61/full/843,/0/default.jpg",
  },
  {
    title: "Autumn Flower and Sparrow",
    maker: "Utagawa Hiroshige",
    date: "c. 1835",
    era: "19th-Century Revival & Historicism",
    culture: "Japanese",
    source: "Art Institute of Chicago",
    objectUrl: "https://www.artic.edu/artworks/56236",
    imageUrl:
      "https://www.artic.edu/iiif/2/e22f4909-4ec3-fd7b-3959-eb8529baccce/full/843,/0/default.jpg",
  },
  {
    title: "Ornament with a Palmette",
    maker: "Sebald Beham",
    date: "n.d.",
    era: "Renaissance & Earlier (pre-1600)",
    culture: "German",
    source: "Art Institute of Chicago",
    objectUrl: "https://www.artic.edu/artworks/95548",
    imageUrl:
      "https://www.artic.edu/iiif/2/f1d37607-55f9-a6cf-c460-fcb1ed71cbd2/full/843,/0/default.jpg",
  },
];

async function listExistingObjectUrls(notion: Client, dataSourceId: string) {
  const existing = new Set<string>();
  let cursor: string | undefined;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of response.results as Array<{
      properties?: { Object?: { url?: string | null } };
    }>) {
      const url = page.properties?.Object?.url;
      if (url) existing.add(url.replace(/\/$/, ""));
    }
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
  return existing;
}

async function main() {
  const auth = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_ORNAMENTS_DATA_SOURCE_ID;
  if (!auth || !dataSourceId) throw new Error("Missing Notion env");

  const notion = new Client({ auth });
  const existing = await listExistingObjectUrls(notion, dataSourceId);

  const toCreate = CANDIDATES.filter(
    (c) => !existing.has(c.objectUrl.replace(/\/$/, "")),
  );

  console.log(
    JSON.stringify(
      {
        candidates: CANDIDATES.length,
        skipping: CANDIDATES.length - toCreate.length,
        creating: toCreate.map((c) => c.title),
      },
      null,
      2,
    ),
  );

  const created: string[] = [];
  for (const item of toCreate) {
    const page = await notion.pages.create({
      parent: { data_source_id: dataSourceId },
      cover: {
        type: "external",
        external: { url: item.imageUrl },
      },
      properties: {
        Name: {
          title: [{ type: "text", text: { content: item.title } }],
        },
        Maker: {
          rich_text: [{ type: "text", text: { content: item.maker } }],
        },
        Date: {
          rich_text: [{ type: "text", text: { content: item.date } }],
        },
        Source: { select: { name: item.source } },
        Era: { select: { name: item.era } },
        Culture: item.culture
          ? {
              rich_text: [
                { type: "text", text: { content: item.culture } },
              ],
            }
          : { rich_text: [] },
        Object: { url: item.objectUrl },
        Status: { select: { name: "Active" } },
        Added: { date: { start: new Date().toISOString().slice(0, 10) } },
      },
    } as never);

    created.push(`${item.title}: ${(page as { id: string }).id}`);
  }

  console.log(JSON.stringify({ created: created.length, pages: created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
