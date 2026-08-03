"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { ArchiveSourceButton } from "@/components/ornaments/ArchiveSourceButton";
import { OrnamentImage } from "@/components/ornaments/OrnamentImage";
import {
  SlidingHighlightList,
  useSlidingHighlight,
} from "@/components/shared/SlidingHighlightRows";
import type { OrnamentFigure } from "@/lib/ornaments/figure-catalog";

type IndexListViewProps = {
  figures: OrnamentFigure[];
  isAdmin: boolean;
  onArchiveChange: (sourceId: string, nextArchived: boolean) => void;
  reduceMotion?: boolean;
  embed?: boolean;
};

function sourceHref(sourceId: string, embed: boolean) {
  return embed
    ? `/sources/${sourceId}?embed=1`
    : `/sources/${sourceId}`;
}

function shortEra(era: string) {
  return (
    era
      .replace(/\s*\([^)]*\)\s*/g, "")
      .replace(/\.$/, "")
      .trim() || "—"
  );
}

function cellText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
  "XXII",
  "XXIII",
  "XXIV",
  "XXV",
  "XXVI",
  "XXVII",
  "XXVIII",
  "XXIX",
  "XXX",
  "XXXI",
  "XXXII",
  "XXXIII",
  "XXXIV",
  "XXXV",
  "XXXVI",
  "XXXVII",
  "XXXVIII",
  "XXXIX",
  "XL",
] as const;

function toRoman(index: number) {
  return ROMAN[index] ?? String(index + 1);
}

function IndexListRow({
  figure,
  index,
  selected,
  isAdmin,
  reduceMotion,
  embed,
  onActivate,
  onArchiveChange,
}: {
  figure: OrnamentFigure;
  index: number;
  selected: boolean;
  isAdmin: boolean;
  reduceMotion: boolean;
  embed: boolean;
  onActivate: () => void;
  onArchiveChange: (sourceId: string, nextArchived: boolean) => void;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { setActiveRow } = useSlidingHighlight();
  const creator = figure.source.creator
    ?.trim()
    .replace(/^Anonymous,\s*/i, "");

  const activate = () => {
    setActiveRow(linkRef.current);
    onActivate();
  };

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: reduceMotion ? 0 : Math.min(index * 0.018, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`ornament-index-list-row group relative ${
        selected ? "is-active" : ""
      }`}
    >
      <Link
        ref={linkRef}
        href={sourceHref(figure.source.id, embed)}
        className="ornament-index-list-link relative z-[1] origin-center transition-transform duration-150 ease-out active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
        aria-current={selected ? "true" : undefined}
        aria-label={figure.source.title}
        onMouseEnter={activate}
        onFocus={activate}
      >
        <span className="ornament-index-list-lead">
          <span className="ornament-index-list-num">{toRoman(index)}</span>
          <span className="ornament-index-list-thumb">
            {figure.source.imageUrl ? (
              <OrnamentImage
                src={figure.source.imageUrl}
                alt=""
                fill
                sizes="40px"
                className="object-contain"
              />
            ) : (
              <span className="block h-full w-full bg-ink/5" />
            )}
          </span>
        </span>

        <span className="ornament-index-list-meta">
          {shortEra(figure.source.era)}
        </span>
        <span className="ornament-index-list-meta">
          {cellText(figure.source.year)}
        </span>
        <span className="ornament-index-list-meta max-lg:hidden truncate">
          {cellText(creator)}
        </span>
      </Link>

      {isAdmin ? (
        <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <ArchiveSourceButton
            sourceId={figure.source.id}
            archived={figure.source.notionStatus === "Archived"}
            onCompleted={(nextArchived) =>
              onArchiveChange(figure.source.id, nextArchived)
            }
          />
        </div>
      ) : null}
    </motion.li>
  );
}

export function IndexListView({
  figures,
  isAdmin,
  onArchiveChange,
  reduceMotion = false,
  embed = false,
}: IndexListViewProps) {
  const [activeId, setActiveId] = useState<string | null>(
    figures[0]?.source.id ?? null,
  );

  useEffect(() => {
    if (figures.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !figures.some((figure) => figure.source.id === activeId)) {
      setActiveId(figures[0]!.source.id);
    }
  }, [activeId, figures]);

  const active =
    figures.find((figure) => figure.source.id === activeId) ?? figures[0] ?? null;

  return (
    <div className="ornament-index-list">
      <div className="ornament-index-list-frame">
        <div className="ornament-index-list-main">
          <div className="ornament-index-list-cols" aria-hidden="true">
            <span />
            <span>Era</span>
            <span>Year</span>
            <span className="max-lg:hidden">By</span>
          </div>

          <SlidingHighlightList className="ornament-index-list-rows">
            {figures.map((figure, index) => (
              <IndexListRow
                key={figure.source.id}
                figure={figure}
                index={index}
                selected={figure.source.id === active?.source.id}
                isAdmin={isAdmin}
                reduceMotion={reduceMotion}
                embed={embed}
                onActivate={() => setActiveId(figure.source.id)}
                onArchiveChange={onArchiveChange}
              />
            ))}
          </SlidingHighlightList>
        </div>

        <aside className="ornament-index-list-preview" aria-live="polite">
          {active ? (
            <Link
              href={sourceHref(active.source.id, embed)}
              className="ornament-index-list-preview-inner"
            >
              <div className="relative min-h-0 flex-1">
                {active.source.imageUrl ? (
                  <OrnamentImage
                    src={active.source.imageUrl}
                    alt={active.source.title}
                    fill
                    sizes="(max-width: 1024px) 40vw, 28vw"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[11px] text-ink/35">
                    —
                  </div>
                )}
              </div>
              <p className="mt-4 shrink-0 font-mono text-[11px] font-light uppercase tracking-[0.08em] text-ink/55">
                {active.source.year?.trim() || "—"}
              </p>
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
