import type { ExportedOrnamentSource } from "./sources-export";

export type OriginPrecision = "site" | "city" | "country";

export type OrnamentOrigin = {
  lat: number;
  lng: number;
  place: string;
  country: string;
  label: string;
  precision: OriginPrecision;
};

type PlaceRecord = {
  lat: number;
  lng: number;
  country: string;
  label: string;
  precision: OriginPrecision;
};

const PLACES: Record<string, PlaceRecord> = {
  "Houghton Hall": {
    lat: 52.827,
    lng: 0.657,
    country: "England",
    label: "Houghton Hall, Norfolk",
    precision: "site",
  },
  "Harewood House": {
    lat: 53.897,
    lng: -1.51,
    country: "England",
    label: "Harewood House, Yorkshire",
    precision: "site",
  },
  Ludwigsburg: {
    lat: 48.8974,
    lng: 9.1916,
    country: "Germany",
    label: "Ludwigsburg",
    precision: "city",
  },
  Paris: {
    lat: 48.8566,
    lng: 2.3522,
    country: "France",
    label: "Paris",
    precision: "city",
  },
  Lyon: {
    lat: 45.764,
    lng: 4.8357,
    country: "France",
    label: "Lyon",
    precision: "city",
  },
  London: {
    lat: 51.5074,
    lng: -0.1278,
    country: "England",
    label: "London",
    precision: "city",
  },
  Florence: {
    lat: 43.7696,
    lng: 11.2558,
    country: "Italy",
    label: "Florence",
    precision: "city",
  },
  Rome: {
    lat: 41.9028,
    lng: 12.4964,
    country: "Italy",
    label: "Rome",
    precision: "city",
  },
  Venice: {
    lat: 45.4408,
    lng: 12.3155,
    country: "Italy",
    label: "Venice",
    precision: "city",
  },
  Naples: {
    lat: 40.8518,
    lng: 14.2681,
    country: "Italy",
    label: "Naples",
    precision: "city",
  },
  Siena: {
    lat: 43.3188,
    lng: 11.3307,
    country: "Italy",
    label: "Siena",
    precision: "city",
  },
  Ferrara: {
    lat: 44.8381,
    lng: 11.6196,
    country: "Italy",
    label: "Ferrara",
    precision: "city",
  },
  Genoa: {
    lat: 44.4056,
    lng: 8.9463,
    country: "Italy",
    label: "Genoa",
    precision: "city",
  },
  Todi: {
    lat: 42.78,
    lng: 12.407,
    country: "Italy",
    label: "Todi",
    precision: "city",
  },
  Moncalvo: {
    lat: 45.051,
    lng: 8.266,
    country: "Italy",
    label: "Moncalvo",
    precision: "city",
  },
  Nuremberg: {
    lat: 49.4521,
    lng: 11.0767,
    country: "Germany",
    label: "Nuremberg",
    precision: "city",
  },
  Heidelberg: {
    lat: 49.3988,
    lng: 8.6724,
    country: "Germany",
    label: "Heidelberg",
    precision: "city",
  },
  Augsburg: {
    lat: 48.3705,
    lng: 10.8978,
    country: "Germany",
    label: "Augsburg",
    precision: "city",
  },
  Prague: {
    lat: 50.0755,
    lng: 14.4378,
    country: "Czechia",
    label: "Prague",
    precision: "city",
  },
  Antwerp: {
    lat: 51.2194,
    lng: 4.4025,
    country: "Flanders",
    label: "Antwerp",
    precision: "city",
  },
  "The Hague": {
    lat: 52.0705,
    lng: 4.3007,
    country: "Netherlands",
    label: "The Hague",
    precision: "city",
  },
  Edo: {
    lat: 35.6762,
    lng: 139.6503,
    country: "Japan",
    label: "Edo",
    precision: "city",
  },
  Guangzhou: {
    lat: 23.1291,
    lng: 113.2644,
    country: "China",
    label: "Guangzhou",
    precision: "city",
  },
  "New York": {
    lat: 40.7128,
    lng: -74.006,
    country: "United States",
    label: "New York",
    precision: "city",
  },
  Philadelphia: {
    lat: 39.9526,
    lng: -75.1652,
    country: "United States",
    label: "Philadelphia",
    precision: "city",
  },
  France: {
    lat: 46.2276,
    lng: 2.2137,
    country: "France",
    label: "France",
    precision: "country",
  },
  Germany: {
    lat: 51.1657,
    lng: 10.4515,
    country: "Germany",
    label: "Germany",
    precision: "country",
  },
  Italy: {
    lat: 42.5,
    lng: 12.5,
    country: "Italy",
    label: "Italy",
    precision: "country",
  },
  England: {
    lat: 52.3555,
    lng: -1.1743,
    country: "England",
    label: "England",
    precision: "country",
  },
  Japan: {
    lat: 36.2048,
    lng: 138.2529,
    country: "Japan",
    label: "Japan",
    precision: "country",
  },
  Czechia: {
    lat: 49.8175,
    lng: 15.473,
    country: "Czechia",
    label: "Czechia",
    precision: "country",
  },
  Flanders: {
    lat: 51.0,
    lng: 4.4,
    country: "Flanders",
    label: "Flanders",
    precision: "country",
  },
  Netherlands: {
    lat: 52.1326,
    lng: 5.2913,
    country: "Netherlands",
    label: "Netherlands",
    precision: "country",
  },
  China: {
    lat: 35.8617,
    lng: 104.1954,
    country: "China",
    label: "China",
    precision: "country",
  },
  "United States": {
    lat: 39.8283,
    lng: -98.5795,
    country: "United States",
    label: "United States",
    precision: "country",
  },
};

const ALIASES: Record<string, string> = {
  french: "France",
  france: "France",
  german: "Germany",
  germany: "Germany",
  italian: "Italy",
  italy: "Italy",
  british: "England",
  english: "England",
  england: "England",
  britain: "England",
  uk: "England",
  "united kingdom": "England",
  "great britain": "England",
  japanese: "Japan",
  japan: "Japan",
  american: "United States",
  america: "United States",
  usa: "United States",
  "united states of america": "United States",
  czech: "Czechia",
  czechia: "Czechia",
  "czech republic": "Czechia",
  flemish: "Flanders",
  flanders: "Flanders",
  belgian: "Flanders",
  belgium: "Flanders",
  dutch: "Netherlands",
  netherlands: "Netherlands",
  holland: "Netherlands",
  chinese: "China",
  china: "China",
  canton: "Guangzhou",
  cantonese: "Guangzhou",
  tokyo: "Edo",
  edo: "Edo",
  florentine: "Florence",
  florence: "Florence",
  venetian: "Venice",
  venice: "Venice",
  neapolitan: "Naples",
  naples: "Naples",
  roman: "Rome",
  paris: "Paris",
  london: "London",
  prague: "Prague",
  nuremberg: "Nuremberg",
  nürnberg: "Nuremberg",
};

const TITLE_PLACES: Array<{ match: RegExp; place: string }> = [
  { match: /houghton\s+hall/i, place: "Houghton Hall" },
  { match: /harewood\s+house/i, place: "Harewood House" },
  { match: /ludwigsburg/i, place: "Ludwigsburg" },
  { match: /farnesina/i, place: "Rome" },
];

const ARTISTS: Array<{ match: RegExp; place: string }> = [
  { match: /labille-guiard/i, place: "Paris" },
  { match: /alphonse\s+mucha/i, place: "Prague" },
  { match: /anne\s+allen/i, place: "London" },
  { match: /frisoni/i, place: "Ludwigsburg" },
  { match: /emil\s+wolff/i, place: "Rome" },
  { match: /francesco\s+di\s+giorgio/i, place: "Siena" },
  { match: /bracquemond/i, place: "Paris" },
  { match: /cavenezia/i, place: "Venice" },
  { match: /maglioli/i, place: "Naples" },
  { match: /foggini/i, place: "Florence" },
  { match: /girolamo\s+da\s+carpi|girolamo\s+sellari/i, place: "Ferrara" },
  { match: /bison/i, place: "Venice" },
  { match: /harry\s+fenn/i, place: "New York" },
  { match: /isaac\s+ware/i, place: "London" },
  { match: /de\s+gheyn/i, place: "The Hague" },
  { match: /pillement/i, place: "Lyon" },
  { match: /greuze/i, place: "Paris" },
  { match: /enderle/i, place: "Augsburg" },
  { match: /macallan\s+swan/i, place: "London" },
  { match: /hokusai/i, place: "Edo" },
  { match: /duruisseau/i, place: "Paris" },
  { match: /\blamqua\b/i, place: "Guangzhou" },
  { match: /lechler/i, place: "Heidelberg" },
  { match: /lorenzo\s+de['’]?\s*ferrari/i, place: "Genoa" },
  { match: /luzio|luzzi/i, place: "Rome" },
  { match: /pergolesi/i, place: "London" },
  { match: /moncalvo|guglielmo\s+caccia/i, place: "Moncalvo" },
  { match: /paul\s+flindt/i, place: "Nuremberg" },
  { match: /perino\s+del\s+vaga|buonaccorsi/i, place: "Rome" },
  { match: /robert\s+adam/i, place: "London" },
  { match: /sebald\s+beham/i, place: "Nuremberg" },
  { match: /thomas\s+fletcher/i, place: "Philadelphia" },
  { match: /hiroshige/i, place: "Edo" },
  { match: /\bmanet\b/i, place: "Paris" },
];

const CREATOR_PLACES: Array<{ match: RegExp; place: string }> = [
  { match: /\bflorentine\b/i, place: "Florence" },
  { match: /\bvenetian\b/i, place: "Venice" },
  { match: /\bneapolitan\b/i, place: "Naples" },
  { match: /\bfrench\b/i, place: "France" },
  { match: /\bgerman\b/i, place: "Germany" },
  { match: /\bitalian\b/i, place: "Italy" },
  { match: /\bbritish\b/i, place: "England" },
  { match: /\benglish\b/i, place: "England" },
  { match: /\bflemish\b/i, place: "Flanders" },
  { match: /\bdutch\b/i, place: "Netherlands" },
  { match: /\bjapanese\b/i, place: "Japan" },
  { match: /\bamerican\b/i, place: "United States" },
  { match: /\bczech\b/i, place: "Czechia" },
  { match: /\bchinese\b/i, place: "China" },
];

function originFromPlace(place: string): OrnamentOrigin | null {
  const record = PLACES[place];
  if (!record) return null;
  return {
    lat: record.lat,
    lng: record.lng,
    place,
    country: record.country,
    label: record.label,
    precision: record.precision,
  };
}

function lookupPlace(raw: string | null | undefined): OrnamentOrigin | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/\.$/, "");
  const aliased = ALIASES[normalized] ?? trimmed;
  if (PLACES[aliased]) return originFromPlace(aliased);

  for (const key of Object.keys(PLACES)) {
    if (key.toLowerCase() === normalized) return originFromPlace(key);
  }

  return null;
}

function matchTitlePlace(title: string): OrnamentOrigin | null {
  for (const entry of TITLE_PLACES) {
    if (entry.match.test(title)) return originFromPlace(entry.place);
  }
  return null;
}

function matchRegionCity(region: string | null): OrnamentOrigin | null {
  if (!region) return null;
  const paren = region.match(/\(([^)]+)\)/);
  if (!paren?.[1]) return null;
  return lookupPlace(paren[1]);
}

function matchArtist(creator: string): OrnamentOrigin | null {
  for (const entry of ARTISTS) {
    if (entry.match.test(creator)) return originFromPlace(entry.place);
  }
  return null;
}

function matchCreatorPlace(creator: string): OrnamentOrigin | null {
  for (const entry of CREATOR_PLACES) {
    if (entry.match.test(creator)) return originFromPlace(entry.place);
  }
  return null;
}

function matchRegionCountry(region: string | null): OrnamentOrigin | null {
  if (!region) return null;
  const beforeParen = region.replace(/\s*\([^)]*\)\s*/g, "").trim();
  return lookupPlace(beforeParen) ?? lookupPlace(region);
}

/** Best-effort geographic origin for a catalog source. */
export function resolveOrnamentOrigin(
  source: Pick<ExportedOrnamentSource, "title" | "creator" | "region">,
): OrnamentOrigin | null {
  return (
    matchTitlePlace(source.title) ??
    matchRegionCity(source.region) ??
    matchArtist(source.creator) ??
    matchCreatorPlace(source.creator) ??
    matchRegionCountry(source.region)
  );
}

export function originClusterKey(origin: OrnamentOrigin) {
  return `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}`;
}

/** Screen-space spread so stacked pins at one origin stay clickable. */
export function originFanOffset(index: number, count: number) {
  if (count <= 1) return { dx: 0, dy: 0 };
  if (count <= 8) {
    const radius = 18 + count * 2;
    const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
    return {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
    };
  }
  const radius = 14 + index * 6;
  const angle = index * 2.39996;
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
  };
}

/** Geographic centroid used to face the globe toward the current set. */
export function originCentroidRotation(
  origins: Pick<OrnamentOrigin, "lat" | "lng">[],
): [number, number] {
  if (origins.length === 0) return [-12, -32];

  let x = 0;
  let y = 0;
  let z = 0;
  for (const origin of origins) {
    const lat = (origin.lat * Math.PI) / 180;
    const lng = (origin.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const hyp = Math.hypot(x, y);
  const lng = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.atan2(z, hyp) * 180) / Math.PI;
  return [-lng, -lat];
}

/**
 * MultiPoint used to fit a regional map. Includes padded corners so a
 * two-city selection still shows surrounding land.
 */
export function originFitGeometry(
  origins: Pick<OrnamentOrigin, "lat" | "lng">[],
): GeoJSON.MultiPoint {
  const lats = origins.map((origin) => origin.lat);
  const lngs = origins.map((origin) => origin.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  const latPad = Math.max(8, (maxLat - minLat) * 0.5 || 12);
  const lngPad = Math.max(10, (maxLng - minLng) * 0.5 || 14);
  minLat = Math.max(-80, minLat - latPad);
  maxLat = Math.min(80, maxLat + latPad);
  minLng -= lngPad;
  maxLng += lngPad;

  return {
    type: "MultiPoint",
    coordinates: [
      ...origins.map((origin) => [origin.lng, origin.lat] as [number, number]),
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
    ],
  };
}
