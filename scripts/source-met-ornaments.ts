import { loadEnvConfig } from "@next/env";
import { Client } from "@notionhq/client";

loadEnvConfig(process.cwd());

type MetObject = {
  objectID: number;
  title?: string;
  artistDisplayName?: string;
  objectDate?: string;
  culture?: string;
  country?: string;
  period?: string;
  medium?: string;
  department?: string;
  objectURL?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
  isPublicDomain?: boolean;
  classification?: string;
  objectBeginDate?: number;
};

function mapEra(begin?: number, dateText?: string): string {
  const text = (dateText ?? "").toLowerCase();
  const year = begin ?? 0;
  if (!year && /undated|n\.?d\.?/i.test(text)) return "Undated & Other";
  if (year > 0 && year < 1600) return "Renaissance & Earlier (pre-1600)";
  if (year >= 1600 && year < 1700) return "Baroque (17th c.)";
  if (year >= 1700 && year < 1800) return "Rococo & Neoclassical (18th c.)";
  if (year >= 1800 && year < 1900) return "19th-Century Revival & Historicism";
  if (year >= 1900) return "Modern (20th c.+)";
  if (/16th|renaissance|medieval|gothic/i.test(text)) {
    return "Renaissance & Earlier (pre-1600)";
  }
  if (/17th|baroque/i.test(text)) return "Baroque (17th c.)";
  if (/18th|rococo|neoclass/i.test(text)) return "Rococo & Neoclassical (18th c.)";
  if (/19th/i.test(text)) return "19th-Century Revival & Historicism";
  if (/20th|21st/i.test(text)) return "Modern (20th c.+)";
  return "Undated & Other";
}

function clusterKey(title: string) {
  const t = title.toLowerCase();
  if (t.includes("chimney")) return "chimney";
  if (t.includes("grotesque")) return "grotesque";
  if (t.includes("frieze")) return "frieze";
  if (t.includes("cartouche")) return "cartouche";
  if (t.includes("candelabra")) return "candelabra";
  if (t.includes("ceiling")) return "ceiling";
  if (t.includes("putt")) return "putti";
  if (t.includes("acanthus")) return "acanthus";
  return "other";
}

function looksLikeKeeperOrnament(obj: MetObject) {
  const blob = [obj.title, obj.classification, obj.medium, obj.department]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!obj.isPublicDomain) return false;
  if (!obj.primaryImage && !obj.primaryImageSmall) return false;
  if (!obj.objectURL) return false;

  const deny = [
    "valance",
    "sofa",
    "tea-pot",
    "teapot",
    "cover design",
    "gardening tools",
    "bundle of flowers",
    "virgin and saints",
    "photograph",
    "costume",
    "portrait of",
  ];
  if (deny.some((term) => blob.includes(term))) return false;

  const allow = [
    "acanthus",
    "putto",
    "putti",
    "frieze",
    "chandelier",
    "cartouche",
    "coat of arms",
    "arabesque",
    "grotesque",
    "palmette",
    "rosette",
    "garland",
    "scroll",
    "ornament",
    "wall monument",
    "sacrament",
    "pavilion",
    "salon",
    "ceiling",
    "capital",
    "cornice",
    "pilaster",
    "candelabra",
    "console",
    "trophy",
    "mask",
    "caryatid",
    "design for a frame",
    "design for a panel",
    "design for an altar",
    "design for a door",
    "design for a ceiling",
    "design for a chimney",
  ];

  return allow.some((term) => blob.includes(term));
}

async function searchIds(query: string) {
  const url = new URL(
    "https://collectionapi.metmuseum.org/public/collection/v1/search",
  );
  url.searchParams.set("q", query);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("medium", "Drawings");
  const res = await fetch(url);
  const data = (await res.json()) as { objectIDs?: number[] };
  return data.objectIDs ?? [];
}

async function fetchObject(id: number) {
  const res = await fetch(
    `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
  );
  if (!res.ok) return null;
  return (await res.json()) as MetObject;
}

async function listExistingMetIds(notion: Client, dataSourceId: string) {
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
      const match = url?.match(/\/search\/(\d+)/);
      if (match?.[1]) existing.add(match[1]);
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
  const existing = await listExistingMetIds(notion, dataSourceId);

  const queries = [
    "acanthus scroll",
    "putti holding",
    "frieze with",
    "cartouche with",
    "grotesque ornament",
    "arabesque design",
    "candelabra design",
    "console table design",
    "coat of arms putti",
    "palmette ornament",
    "design for a ceiling",
    "design for a chimney piece",
    "design for a door",
    "ornamental frame design",
  ];

  const idSet = new Set<number>();
  for (const q of queries) {
    const ids = await searchIds(q);
    for (const id of ids.slice(0, 50)) idSet.add(id);
  }

  const clusterCounts = new Map<string, number>();
  const candidates: MetObject[] = [];

  for (const id of idSet) {
    if (existing.has(String(id))) continue;
    const obj = await fetchObject(id);
    if (!obj || !looksLikeKeeperOrnament(obj)) continue;

    const cluster = clusterKey(obj.title ?? "");
    const count = clusterCounts.get(cluster) ?? 0;
    // Keep batches varied — avoid 12 chimney pieces in a row.
    if (count >= 3 && cluster !== "other") continue;

    clusterCounts.set(cluster, count + 1);
    candidates.push(obj);
    if (candidates.length >= 12) break;
  }

  console.log(
    JSON.stringify(
      {
        found: candidates.length,
        clusters: Object.fromEntries(clusterCounts),
        titles: candidates.map((c) => ({
          id: c.objectID,
          title: c.title,
          date: c.objectDate,
          artist: c.artistDisplayName,
        })),
      },
      null,
      2,
    ),
  );

  const created: string[] = [];
  for (const obj of candidates) {
    const image = obj.primaryImage || obj.primaryImageSmall;
    const culture = obj.culture || obj.country || obj.period || undefined;
    const maker = obj.artistDisplayName?.trim() || "Anonymous";
    const date = obj.objectDate?.trim() || "n.d.";
    const era = mapEra(obj.objectBeginDate, obj.objectDate);

    const page = await notion.pages.create({
      parent: { data_source_id: dataSourceId },
      cover: image
        ? { type: "external", external: { url: image } }
        : undefined,
      properties: {
        Name: {
          title: [
            {
              type: "text",
              text: { content: obj.title || "Untitled ornament" },
            },
          ],
        },
        Maker: {
          rich_text: [{ type: "text", text: { content: maker } }],
        },
        Date: {
          rich_text: [{ type: "text", text: { content: date } }],
        },
        Source: { select: { name: "The Met" } },
        Era: { select: { name: era } },
        Culture: culture
          ? { rich_text: [{ type: "text", text: { content: culture } }] }
          : { rich_text: [] },
        Object: { url: obj.objectURL || null },
        Status: { select: { name: "Active" } },
        Added: { date: { start: new Date().toISOString().slice(0, 10) } },
      },
    } as never);

    created.push(`${obj.objectID}: ${(page as { id: string }).id}`);
  }

  console.log(JSON.stringify({ created: created.length, pages: created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
