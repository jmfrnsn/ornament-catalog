import type { Motif, Source } from "./schema";

export type ProjectSuggestion = {
  title: string;
  theme: string;
  motifIds: string[];
  sourceIds: string[];
  status: "idea";
  notes: string;
  potentialFormats: string[];
};

type WeaverOptions = {
  desiredFormatTypes?: string[];
  limit?: number;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function groupKey(motif: Motif) {
  return `${motif.style} ${motif.motifType}`.trim();
}

function formatTitle(style: string, motifType: string) {
  return `${style} ${motifType} field study`
    .replace(/\s+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function suggestProjectThreads(
  motifs: Motif[],
  sources: Source[] = [],
  options: WeaverOptions = {},
): ProjectSuggestion[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const groups = new Map<string, Motif[]>();

  for (const motif of motifs) {
    const key = groupKey(motif);
    groups.set(key, [...(groups.get(key) ?? []), motif]);
  }

  return [...groups.entries()]
    .sort(([, left], [, right]) => {
      const leftScore = left.reduce((sum, motif) => sum + motif.resonanceScore, 0);
      const rightScore = right.reduce((sum, motif) => sum + motif.resonanceScore, 0);
      return rightScore - leftScore;
    })
    .slice(0, options.limit ?? 3)
    .map(([key, groupedMotifs]) => {
      const [style, ...typeParts] = key.split(" ");
      const motifType = typeParts.at(-1) ?? groupedMotifs[0]?.motifType ?? "ornament";
      const linkedSources = unique(groupedMotifs.map((motif) => motif.sourceId));
      const sourceTitles = linkedSources
        .map((sourceId) => sourceById.get(sourceId)?.title)
        .filter(Boolean)
        .join(", ");

      return {
        title: formatTitle(groupedMotifs[0]?.style ?? style, motifType),
        theme: `${groupedMotifs[0]?.style ?? style} ${motifType} motifs with shared resonance across ${groupedMotifs.length} catalog entries.`,
        motifIds: groupedMotifs.map((motif) => motif.id),
        sourceIds: linkedSources,
        status: "idea",
        notes: sourceTitles
          ? `Candidate thread woven from ${sourceTitles}.`
          : "Candidate thread woven from high-resonance motifs.",
        potentialFormats: options.desiredFormatTypes?.length
          ? options.desiredFormatTypes
          : ["essay", "zine", "print_series"],
      };
    });
}
