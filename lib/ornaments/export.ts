import fs from "node:fs";
import path from "node:path";
import { listSources } from "./repository";
import type { Source } from "./schema";

export const DEFAULT_ORNAMENT_EXPORT_PATH = path.join(
  "data",
  "ornaments",
  "sources.json",
);

type ExportedSource = {
  id: string;
  notionPageId: string | null;
  title: string;
  creator: string;
  year: string;
  type: string;
  era: string;
  region: string | null;
  url: string | null;
  imageUrl: string | null;
  status: Source["status"];
  notionStatus: "Active" | "Archived";
  archivedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type OrnamentSourcesExport = {
  schemaVersion: 1;
  counts: {
    total: number;
    active: number;
    archived: number;
  };
  sources: ExportedSource[];
};

function sourceSortKey(source: Source) {
  return [
    source.notionPageId ?? "",
    source.title,
    source.id,
  ].join("\u0000");
}

function toExportedSource(source: Source): ExportedSource {
  const notionStatus = source.archivedAt ? "Archived" : "Active";

  return {
    id: source.id,
    notionPageId: source.notionPageId,
    title: source.title,
    creator: source.creator,
    year: source.year,
    type: source.type,
    era: source.era,
    region: source.region,
    url: source.url,
    imageUrl: source.filePath,
    status: source.status,
    notionStatus,
    archivedAt: source.archivedAt,
    notes: source.notes,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export async function buildOrnamentSourcesExport(): Promise<OrnamentSourcesExport> {
  const allSources = await listSources({ includeArchived: true });
  const sources = [...allSources]
    .sort((left, right) => sourceSortKey(left).localeCompare(sourceSortKey(right)))
    .map(toExportedSource);

  return {
    schemaVersion: 1,
    counts: {
      total: sources.length,
      active: sources.filter((source) => source.notionStatus === "Active").length,
      archived: sources.filter((source) => source.notionStatus === "Archived").length,
    },
    sources,
  };
}

export async function writeOrnamentSourcesExport(
  exportPath = DEFAULT_ORNAMENT_EXPORT_PATH,
) {
  const snapshot = await buildOrnamentSourcesExport();
  const absolutePath = path.resolve(process.cwd(), exportPath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(snapshot, null, 2)}\n`);

  return {
    exportPath,
    absolutePath,
    snapshot,
  };
}
