import fs from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";

import bundledSourcesExport from "@/data/ornaments/sources.json";

import type { Source } from "./schema";

export type ExportedOrnamentSource = {
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

export type OrnamentSourcesExport = {
  schemaVersion: 1;
  counts: {
    total: number;
    active: number;
    archived: number;
  };
  sources: ExportedOrnamentSource[];
};

export type SourceArchiveView = "active" | "archived" | "all";

export type SourceListFilters = {
  view?: SourceArchiveView;
  era?: string;
  type?: string;
  region?: string;
};

export const ORNAMENT_SOURCES_EXPORT_PATH = path.join(
  process.cwd(),
  "data",
  "ornaments",
  "sources.json",
);

function recount(sources: ExportedOrnamentSource[]) {
  return {
    total: sources.length,
    active: sources.filter((source) => source.notionStatus === "Active").length,
    archived: sources.filter((source) => source.notionStatus === "Archived")
      .length,
  };
}

function readExportFromDisk(): OrnamentSourcesExport | null {
  try {
    if (!fs.existsSync(ORNAMENT_SOURCES_EXPORT_PATH)) return null;
    const raw = fs.readFileSync(ORNAMENT_SOURCES_EXPORT_PATH, "utf8");
    return JSON.parse(raw) as OrnamentSourcesExport;
  } catch {
    return null;
  }
}

export function loadOrnamentSourcesExport(): OrnamentSourcesExport {
  noStore();
  return readExportFromDisk() ?? (bundledSourcesExport as OrnamentSourcesExport);
}

export function listExportedSources(
  filters: SourceListFilters = {},
): ExportedOrnamentSource[] {
  const { sources } = loadOrnamentSourcesExport();
  const view = filters.view ?? "active";

  return sources.filter((source) => {
    if (view === "active" && source.notionStatus !== "Active") return false;
    if (view === "archived" && source.notionStatus !== "Archived") return false;
    if (filters.era && source.era !== filters.era) return false;
    if (filters.type && source.type !== filters.type) return false;
    if (filters.region && source.region !== filters.region) return false;
    return true;
  });
}

export function getExportedSource(
  id: string,
): ExportedOrnamentSource | undefined {
  return loadOrnamentSourcesExport().sources.find((source) => source.id === id);
}

export function getExportedSourceFilterOptions() {
  const { sources } = loadOrnamentSourcesExport();
  const active = sources.filter((source) => source.notionStatus === "Active");

  return {
    eras: uniqueSorted(active.map((source) => source.era)),
    types: uniqueSorted(active.map((source) => source.type)),
    regions: uniqueSorted(
      active
        .map((source) => source.region)
        .filter((region): region is string => Boolean(region)),
    ),
  };
}

/**
 * Patch the committed export file so archive/restore is visible immediately
 * on hosts with a writable filesystem (local/dev). Returns false when the
 * file cannot be written (e.g. Vercel), in which case GitHub sync must catch up.
 */
export function patchExportedSourceArchiveState(
  id: string,
  archived: boolean,
): boolean {
  try {
    const snapshot = loadOrnamentSourcesExport();
    const index = snapshot.sources.findIndex((source) => source.id === id);
    if (index < 0) return false;

    const timestamp = new Date().toISOString();
    const current = snapshot.sources[index];
    snapshot.sources[index] = {
      ...current,
      notionStatus: archived ? "Archived" : "Active",
      archivedAt: archived ? (current.archivedAt ?? timestamp) : null,
      updatedAt: timestamp,
    };
    snapshot.counts = recount(snapshot.sources);

    fs.writeFileSync(
      ORNAMENT_SOURCES_EXPORT_PATH,
      `${JSON.stringify(snapshot, null, 2)}\n`,
    );
    return true;
  } catch (error) {
    console.warn("[ornaments] Could not patch sources export", error);
    return false;
  }
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
