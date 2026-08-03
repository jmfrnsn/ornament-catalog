import type { ExportedOrnamentSource } from "./sources-export";

export type OrnamentFigure = {
  source: ExportedOrnamentSource;
  index: number;
  figLabel: string;
  catalogCode: string;
  titleLabel: string;
  dateLabel: string;
};

/** Chronological era ranking used across catalog layouts. */
const ERA_ORDER: Array<{ match: RegExp; rank: number }> = [
  { match: /renaissance|earlier|pre-?1600|medieval|gothic/i, rank: 10 },
  { match: /baroque|17th/i, rank: 20 },
  { match: /rococo|neoclass|18th/i, rank: 30 },
  { match: /19th|revival|historicism/i, rank: 40 },
  { match: /modern|20th|21st/i, rank: 50 },
  { match: /undated|other/i, rank: 90 },
];

function formatFigLabel(index: number) {
  return `(Fig.${String(index + 1).padStart(2, "0")})`;
}

function formatDateLabel(year: string) {
  const trimmed = year.trim();
  if (!trimmed || trimmed.toLowerCase() === "n.d.") {
    return "n.d.";
  }

  if (/[–—-]|\bcentury\b|\d{4}\s*[-–]\s*\d{4}/i.test(trimmed)) {
    return `*(${trimmed})`;
  }

  return trimmed;
}

function eraRank(era: string) {
  for (const entry of ERA_ORDER) {
    if (entry.match.test(era)) return entry.rank;
  }
  return 80;
}

/** Best-effort year for secondary sort within an era. */
export function parseOrnamentYear(year: string) {
  const trimmed = year.trim();
  if (!trimmed || /^n\.?d\.?$/i.test(trimmed)) return Number.POSITIVE_INFINITY;

  const century = trimmed.match(/(\d{1,2})(?:st|nd|rd|th)\s*c/i);
  if (century?.[1]) {
    return (Number(century[1]) - 1) * 100 + 50;
  }

  const range = trimmed.match(/(\d{3,4})\s*[-–—]\s*(\d{2,4})/);
  if (range?.[1]) {
    return Number(range[1]);
  }

  const single = trimmed.match(/\b(\d{3,4})\b/);
  if (single?.[1]) {
    return Number(single[1]);
  }

  return Number.POSITIVE_INFINITY;
}

export function compareOrnamentSourcesByPeriod(
  left: ExportedOrnamentSource,
  right: ExportedOrnamentSource,
) {
  const eraDelta = eraRank(left.era) - eraRank(right.era);
  if (eraDelta !== 0) return eraDelta;

  const yearDelta = parseOrnamentYear(left.year) - parseOrnamentYear(right.year);
  if (yearDelta !== 0) return yearDelta;

  return left.title.localeCompare(right.title);
}

export function sortOrnamentSourcesByPeriod(
  sources: ExportedOrnamentSource[],
) {
  return [...sources].sort(compareOrnamentSourcesByPeriod);
}

/** Short plate captions, closer to catalog index labels than full museum titles. */
export function simplifyCaptionTitle(title: string) {
  let simplified = title.trim().replace(/\s+/g, " ");

  // Drop trailing parentheticals: "(German, 17th century)", "(… pl. 38)"
  simplified = simplified.replace(/(?:\s*\([^)]*\))+\s*$/g, "").trim();

  // "Design for an Alcove…" → "Alcove…"
  simplified = simplified
    .replace(/^Designs?\s+for\s+(?:an?\s+|the\s+)?/i, "")
    .trim();

  // Keep the object noun, drop long descriptive tails.
  // "Alcove with a Coat of Arms…" → "Alcove"
  // "Ornament Design with Vases" → "Ornament Design"
  const withMatch = simplified.match(
    /^(.+?)\s+with\s+(?:a|an|the)\s+/i,
  );
  if (withMatch?.[1]) {
    simplified = withMatch[1].trim();
  } else {
    const genericWith = simplified.match(/^(.+?)\s+with\s+/i);
    if (genericWith?.[1] && simplified.length > 28) {
      simplified = genericWith[1].trim();
    }
  }

  // "Chandelier … Motifs" leftovers
  simplified = simplified.replace(/\s+Motifs?$/i, "").trim();

  return simplified || title.trim();
}

/** Sort by period, then assign fig labels and A.1 / B.2 codes by era. */
export function toOrnamentFigures(
  sources: ExportedOrnamentSource[],
): OrnamentFigure[] {
  const ordered = sortOrnamentSourcesByPeriod(sources);
  const eras = [...new Set(ordered.map((source) => source.era))].sort(
    (left, right) => eraRank(left) - eraRank(right) || left.localeCompare(right),
  );
  const eraLetters = new Map(
    eras.map((era, index) => [
      era,
      String.fromCharCode(65 + (index % 26)),
    ]),
  );
  const eraCounts = new Map<string, number>();

  return ordered.map((source, index) => {
    const letter = eraLetters.get(source.era) ?? "Z";
    const next = (eraCounts.get(letter) ?? 0) + 1;
    eraCounts.set(letter, next);

    return {
      source,
      index,
      figLabel: formatFigLabel(index),
      catalogCode: `${letter}.${next}`,
      titleLabel: simplifyCaptionTitle(source.title),
      dateLabel: formatDateLabel(source.year),
    };
  });
}
