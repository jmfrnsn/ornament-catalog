"use client";

import { useEffect, useMemo, useState } from "react";

import { IndexView } from "@/components/ornaments/IndexView";
import { toOrnamentFigures } from "@/lib/ornaments/figure-catalog";
import type { ExportedOrnamentSource } from "@/lib/ornaments/sources-export";

const PENDING_ARCHIVE_KEY = "ornament-pending-archive-ids";

type SourceListProps = {
  sources: ExportedOrnamentSource[];
  /** Lab iframe — keep navigation inside the ornaments scope. */
  embed?: boolean;
};

function readPendingArchiveIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(PENDING_ARCHIVE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.filter((value): value is string => typeof value === "string"),
    );
  } catch {
    return new Set<string>();
  }
}

function writePendingArchiveIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_ARCHIVE_KEY, JSON.stringify([...ids]));
}

export function SourceList({ sources, embed = false }: SourceListProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const pending = readPendingArchiveIds();
    const serverIds = new Set(sources.map((source) => source.id));
    for (const id of [...pending]) {
      if (!serverIds.has(id)) {
        pending.delete(id);
      }
    }
    writePendingArchiveIds(pending);
    setHiddenIds(pending);
  }, [sources]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/admin/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = (await response.json()) as { authenticated?: boolean };
        if (!cancelled) {
          setIsAdmin(Boolean(body.authenticated));
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSources = useMemo(
    () => sources.filter((source) => !hiddenIds.has(source.id)),
    [hiddenIds, sources],
  );
  const figures = useMemo(
    () => toOrnamentFigures(visibleSources),
    [visibleSources],
  );

  function handleArchiveChange(sourceId: string, nextArchived: boolean) {
    const source = sources.find((entry) => entry.id === sourceId);
    if (!source) return;
    const viewingArchived = source.notionStatus === "Archived";
    const shouldHide = nextArchived !== viewingArchived;

    setHiddenIds((current) => {
      const next = new Set(current);
      if (shouldHide) {
        next.add(sourceId);
      } else {
        next.delete(sourceId);
      }
      writePendingArchiveIds(next);
      return next;
    });
  }

  if (figures.length === 0) {
    return (
      <p className="text-center font-serif text-base text-ink/60">
        No ornaments yet.
      </p>
    );
  }

  return (
    <IndexView
      figures={figures}
      isAdmin={isAdmin}
      onArchiveChange={handleArchiveChange}
      embed={embed}
    />
  );
}
