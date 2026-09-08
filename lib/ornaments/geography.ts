import { geoDistance } from "d3-geo";
import researchedOrigins from "@/data/ornaments/origins.json";
import type { OrnamentFigure } from "./figure-catalog";

export type OriginAttribution = {
  id: string;
  countryCode: string;
  country: string;
  label: string;
  basis: string;
  note: string;
  evidenceUrl: string;
};

export type OriginRegion = {
  code: string;
  name: string;
  /** Representative country position, never an object's exact coordinates. */
  coordinates: [number, number];
};

const REGIONS: Array<OriginRegion & { aliases: string[] }> = [
  { code: "250", name: "France", coordinates: [2.5, 46.5], aliases: ["france", "french"] },
  { code: "276", name: "Germany", coordinates: [10.4, 51.1], aliases: ["germany", "german"] },
  { code: "380", name: "Italy", coordinates: [12.5, 42.5], aliases: ["italy", "italian", "italian (florence)"] },
  { code: "826", name: "United Kingdom", coordinates: [-2, 54], aliases: ["united kingdom", "britain", "british", "england", "english", "scotland", "scottish"] },
  { code: "203", name: "Czechia", coordinates: [15.4, 49.8], aliases: ["czech", "czechia", "czech republic"] },
  { code: "156", name: "China", coordinates: [104, 35], aliases: ["china", "chinese"] },
  { code: "392", name: "Japan", coordinates: [138, 37], aliases: ["japan", "japanese"] },
  { code: "840", name: "United States", coordinates: [-99, 39], aliases: ["united states", "american", "usa"] },
];

const research = new Map(
  (researchedOrigins as OriginAttribution[]).map((origin) => [origin.id, origin]),
);

export type LocatedFigure = {
  figure: OrnamentFigure;
  region: OriginRegion | null;
  attribution: OriginAttribution | null;
};

/** Never geocode a holding museum, a creator's name, or a depicted place. */
export function locateFigure(figure: OrnamentFigure): LocatedFigure {
  const verified = research.get(figure.source.id);
  const verifiedRegion = verified && REGIONS.find((region) => region.code === verified.countryCode);
  if (verifiedRegion) {
    return { figure, region: verifiedRegion, attribution: verified! };
  }

  const rawRegion = figure.source.region?.trim().toLowerCase();
  const region = REGIONS.find((entry) => rawRegion && entry.aliases.includes(rawRegion));
  if (!region) return { figure, region: null, attribution: null };
  return {
    figure,
    region,
    attribution: {
      id: figure.source.id,
      countryCode: region.code,
      country: region.name,
      label: figure.source.region!,
      basis: "Catalog region",
      note: `Recorded in the catalog as “${figure.source.region}”. Country-level attribution, not a confirmed place of creation.`,
      evidenceUrl: figure.source.url ?? "",
    },
  };
}

export type OriginGroup = {
  region: OriginRegion;
  items: LocatedFigure[];
};

export function groupFigureOrigins(figures: OrnamentFigure[]) {
  const groups = new Map<string, OriginGroup>();
  const unplaced: LocatedFigure[] = [];
  for (const figure of figures) {
    const item = locateFigure(figure);
    if (!item.region) {
      unplaced.push(item);
      continue;
    }
    let group = groups.get(item.region.code);
    if (!group) {
      group = { region: item.region, items: [] };
      groups.set(item.region.code, group);
    }
    group.items.push(item);
  }
  return {
    groups: [...groups.values()].sort((a, b) => a.region.name.localeCompare(b.region.name)),
    unplaced,
  };
}

/** A spread exceeding 60 spherical degrees calls for a globe, not a close-up map. */
export function geographicDisplayMode(groups: OriginGroup[]): "globe" | "map" {
  for (const a of groups) {
    for (const b of groups) {
      if (geoDistance(a.region.coordinates, b.region.coordinates) > Math.PI / 3) return "globe";
    }
  }
  return "map";
}
