"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ArchiveSourceButton } from "@/components/ornaments/ArchiveSourceButton";
import { IndexListView } from "@/components/ornaments/IndexListView";
import { OrnamentImage } from "@/components/ornaments/OrnamentImage";
import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";

type IndexViewProps = {
  figures: OrnamentFigure[];
  isAdmin: boolean;
  onArchiveChange: (sourceId: string, nextArchived: boolean) => void;
  /** Lab iframe — title is plain text (no home link). */
  embed?: boolean;
};

type IndexDisplayMode = "grid" | "list";

const INDEX_DISPLAY_STORAGE_KEY = "ornament-index-display";

function isIndexDisplayMode(value: unknown): value is IndexDisplayMode {
  return value === "grid" || value === "list";
}

function shortEra(era: string) {
  return (
    era
      .replace(/\s*\([^)]*\)\s*/g, "")
      .replace(/\.$/, "")
      .trim() || era
  );
}

function sourceHref(sourceId: string, embed: boolean) {
  return embed
    ? `/sources/${sourceId}?embed=1`
    : `/sources/${sourceId}`;
}

function SpecimenCell({
  figure,
  isAdmin,
  onArchiveChange,
  delay,
  reduceMotion,
  embed,
}: {
  figure: OrnamentFigure;
  isAdmin: boolean;
  onArchiveChange: (sourceId: string, nextArchived: boolean) => void;
  delay: number;
  reduceMotion: boolean;
  embed: boolean;
}) {
  const year = figure.source.year?.trim() || "";

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="ornament-index-cell group relative flex h-full min-h-0 flex-col"
    >
      <Link
        href={sourceHref(figure.source.id, embed)}
        className="flex h-full min-h-0 flex-col items-center px-6 py-8 sm:px-8 sm:py-10"
      >
        <div className="relative mx-auto w-full max-w-[9.5rem] flex-1">
          <div className="relative aspect-[4/5] w-full">
            {figure.source.imageUrl ? (
              <OrnamentImage
                src={figure.source.imageUrl}
                alt={figure.source.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 14vw"
                className="object-contain transition-opacity duration-500 ease-out group-hover:opacity-90"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-serif text-xs text-ink/30">
                —
              </div>
            )}
          </div>
        </div>

        {year ? (
          <p className="mt-6 text-center font-mono text-[9px] font-extralight uppercase tracking-[0.14em] text-ink/40">
            {year}
          </p>
        ) : null}
      </Link>

      {isAdmin ? (
        <div className="absolute right-2 top-2 z-10">
          <ArchiveSourceButton
            sourceId={figure.source.id}
            archived={figure.source.notionStatus === "Archived"}
            onCompleted={(nextArchived) =>
              onArchiveChange(figure.source.id, nextArchived)
            }
          />
        </div>
      ) : null}
    </motion.article>
  );
}

export function IndexView({
  figures,
  isAdmin,
  onArchiveChange,
  embed = false,
}: IndexViewProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [display, setDisplay] = useState<IndexDisplayMode>(
    embed ? "grid" : "list",
  );
  const [eraFilter, setEraFilter] = useState<string | null>(null);

  const paneTransition = {
    duration: reduceMotion ? 0.01 : 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const paneExitTransition = {
    duration: reduceMotion ? 0.01 : 0.16,
    ease: [0.4, 0, 1, 1] as const,
  };

  useEffect(() => {
    if (embed) {
      setDisplay("grid");
      return;
    }
    try {
      const stored = window.localStorage.getItem(INDEX_DISPLAY_STORAGE_KEY);
      if (isIndexDisplayMode(stored)) setDisplay(stored);
    } catch {
      // ignore
    }
  }, [embed]);

  useEffect(() => {
    if (embed) return;
    try {
      window.localStorage.setItem(INDEX_DISPLAY_STORAGE_KEY, display);
    } catch {
      // ignore
    }
  }, [display, embed]);

  const eras = useMemo(() => {
    const seen = new Map<string, string>();
    for (const figure of figures) {
      const raw = figure.source.era?.trim();
      if (!raw || seen.has(raw)) continue;
      seen.set(raw, shortEra(raw));
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [figures]);

  useEffect(() => {
    if (eraFilter && !eras.some(([raw]) => raw === eraFilter)) {
      setEraFilter(null);
    }
  }, [eraFilter, eras]);

  const visibleFigures = useMemo(() => {
    if (!eraFilter) return figures;
    return figures.filter((figure) => figure.source.era === eraFilter);
  }, [eraFilter, figures]);

  const count = visibleFigures.length;

  return (
    <div
      className={
        embed
          ? "ornament-index relative w-full"
          : "ornament-index relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 pb-10"
      }
    >
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="ornament-index-head w-full font-mono text-[11px] font-light uppercase leading-[1.55] tracking-[0.06em]"
      >
        <div className="ornament-index-head-cell">
          {embed ? (
            <div className="inline-flex max-w-full flex-col text-ink">
              <span>Ornament Research Catalog</span>
              <span className="text-ink/65">
                {count} {count === 1 ? "specimen" : "specimens"}
              </span>
            </div>
          ) : (
            <Link
              href="/"
              aria-label="Back home"
              className="group/home inline-flex max-w-full flex-col text-ink"
            >
              <span className="relative inline-grid">
                <span className="col-start-1 row-start-1 transition-opacity duration-200 ease-out group-hover/home:opacity-0 group-focus-visible/home:opacity-0">
                  Ornament Research Catalog
                </span>
                <span
                  aria-hidden
                  className="col-start-1 row-start-1 opacity-0 transition-opacity duration-200 ease-out group-hover/home:opacity-100 group-focus-visible/home:opacity-100"
                >
                  ← Home
                </span>
              </span>
              <span className="text-ink/65 transition-opacity duration-200 ease-out group-hover/home:opacity-0 group-focus-visible/home:opacity-0">
                {count} {count === 1 ? "specimen" : "specimens"}
              </span>
            </Link>
          )}
        </div>

        <div
          className="ornament-index-head-cell is-flush-left tracking-[0.08em]"
          role="group"
          aria-label="Filter by era"
        >
          <button
            type="button"
            aria-pressed={eraFilter === null}
            onClick={() => setEraFilter(null)}
            className={`cursor-pointer uppercase transition-colors ${
              eraFilter === null ? "text-ink" : "text-ink/55 hover:text-ink"
            }`}
          >
            All
          </button>
          {eras.map(([raw, label]) => {
            const selected = eraFilter === raw;
            return (
              <span key={raw}>
                <span aria-hidden>,{" "}</span>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setEraFilter(selected ? null : raw)}
                  className={`cursor-pointer uppercase transition-colors ${
                    selected ? "text-ink" : "text-ink/55 hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              </span>
            );
          })}
        </div>

        <div className="ornament-index-head-cell hidden lg:block" aria-hidden />

        <div
          className="ornament-index-head-cell flex justify-start gap-x-0 max-lg:col-start-2 lg:justify-end"
          role="group"
          aria-label="Index display"
        >
          {(
            [
              { id: "list", label: "List" },
              { id: "grid", label: "Grid" },
            ] as const
          ).map((option, index) => {
            const selected = display === option.id;
            return (
              <span key={option.id}>
                {index > 0 ? <span aria-hidden>,{" "}</span> : null}
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDisplay(option.id)}
                  className={`cursor-pointer uppercase transition-colors ${
                    selected ? "text-ink" : "text-ink/55 hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              </span>
            );
          })}
        </div>
      </motion.header>

      <div className="relative grid [&>*]:col-start-1 [&>*]:row-start-1">
        <AnimatePresence initial={false}>
          {display === "list" ? (
            <motion.div
              key="list"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: -4,
                      pointerEvents: "none",
                      transition: paneExitTransition,
                    }
              }
              transition={paneTransition}
            >
              <IndexListView
                figures={visibleFigures}
                isAdmin={isAdmin}
                onArchiveChange={onArchiveChange}
                reduceMotion={reduceMotion}
                embed={embed}
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={reduceMotion ? false : { y: 6 }}
              animate={{ y: 0 }}
              exit={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: -4,
                      pointerEvents: "none",
                      transition: paneExitTransition,
                    }
              }
              transition={paneTransition}
            >
              <div className="ornament-index-grid">
                {visibleFigures.map((figure, index) => (
                  <SpecimenCell
                    key={figure.source.id}
                    figure={figure}
                    isAdmin={isAdmin}
                    onArchiveChange={onArchiveChange}
                    delay={
                      reduceMotion ? 0 : Math.min(index * 0.022, 0.55)
                    }
                    reduceMotion={reduceMotion}
                    embed={embed}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
