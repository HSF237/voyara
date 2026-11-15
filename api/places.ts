import * as z from 'zod';
import { categoryOfKinds, DURATION_MIN } from '../src/planner/categories.js';
import { distanceKm } from '../src/planner/geo.js';
import type { Category, PlaceCandidate } from '../src/planner/types.js';
import { fetchWithTimeout, json, mapLimit, problem, tooMany } from './_lib/http.js';
import { thumb } from './_lib/images.js';

/**
 * GET /api/places?lat=..&lng=..
 * Real places to visit around a destination, from OpenTripMap (OpenStreetMap +
 * Wikipedia data). The API key stays on the server.
 */

const OTM = 'https://api.opentripmap.com/0.1/en/places';
const MAX_PLACES = 36;
/** More than we keep are looked up, so places without a photo can make way for ones with. */
const LOOKUPS = 48;
const PER_CATEGORY = 12;
// Hotels, banks, stations, and rail viaducts tagged as "bridges" are not places to visit.
const SKIP = /\b(accomodations|adult|banks|transport|railway_stations|bus_stations|industrial_facilities|fuel|atm|viaducts|other_bridges)\b/; // prettier-ignore

const query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const listItem = z.object({
  xid: z.string(),
  name: z.string(),
  rate: z.number(),
  kinds: z.string(),
  wikidata: z.string().optional(),
  point: z.object({ lon: z.number(), lat: z.number() }),
});

const details = z.object({
  wikipedia: z.string().optional(),
  image: z.string().optional(),
  preview: z.object({ source: z.string() }).optional(),
  wikipedia_extracts: z.object({ text: z.string() }).optional(),
  address: z.record(z.string(), z.string()).optional(),
});

type Listed = z.infer<typeof listItem> & { category: Category; rating: number };

const cache = new Map<string, { at: number; places: PlaceCandidate[] }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

/** OpenTripMap rates 1–3, and 5–7 for the same levels with heritage status. */
const ratingOf = (rate: number) => Math.max(1, Math.min(3, rate > 3 ? rate - 4 : rate));

/** First sentences of an extract, up to about 260 characters. */
function shorten(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 260) return clean;
  const cut = clean.slice(0, 260);
  const stop = cut.lastIndexOf('. ');
  return stop > 120 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

async function nearby(lat: number, lng: number, radius: number, minRate: 2 | 3, key: string): Promise<Listed[]> {
  const url = `${OTM}/radius?radius=${radius}&lon=${lng}&lat=${lat}&rate=${minRate}&format=json&limit=500&apikey=${key}`;
  const response = await fetchWithTimeout(url, {}, 12_000);
  if (!response.ok) throw new Error(`places source answered ${response.status}`);
  const parsed = z.array(listItem).safeParse(await response.json());
  if (!parsed.success) throw new Error('places source sent an unexpected shape');

  const seen = new Set<string>();
  const kept: Listed[] = [];
  const ranked = parsed.data
    .filter((item) => item.name.trim().length > 1 && !SKIP.test(item.kinds))
    .map((item) => ({ ...item, category: categoryOfKinds(item.kinds, item.name), rating: ratingOf(item.rate) }))
    .sort((a, b) => b.rating - a.rating);
  for (const item of ranked) {
    const name = item.name.trim().toLowerCase();
    const same = item.wikidata ?? name;
    // The same sight often appears twice (a building and its grounds): keep one.
    const twin = kept.some(
      (other) =>
        other.category === item.category &&
        distanceKm({ lat: other.point.lat, lng: other.point.lon }, { lat: item.point.lat, lng: item.point.lon }) < 0.08,
    );
    if (seen.has(same) || seen.has(name) || twin) continue;
    seen.add(same);
    seen.add(name);
    kept.push(item);
  }
  return kept;
} // prettier-ignore

/**
 * A varied shortlist: categories take turns, each offering its best-rated place
 * next, so a city full of temples or museums still shows its parks and views.
 */
function shortlist(items: Listed[]): Listed[] {
  const queues = new Map<Category, Listed[]>();
  for (const item of items) queues.set(item.category, [...(queues.get(item.category) ?? []), item]);
  const picked: Listed[] = [];
  for (let round = 0; round < PER_CATEGORY && picked.length < LOOKUPS; round += 1) {
    for (const queue of queues.values()) {
      const next = queue[round];
      if (next && picked.length < LOOKUPS) picked.push(next);
    }
  }
  return picked;
}

async function describe(item: Listed, key: string): Promise<PlaceCandidate> {
  const base: PlaceCandidate = {
    id: `otm:${item.xid}`,
    name: item.name.trim(),
    lat: item.point.lat,
    lng: item.point.lon,
    category: item.category,
    rating: item.rating,
    durationMin: DURATION_MIN[item.category],
  };
  try {
    const url = `${OTM}/xid/${encodeURIComponent(item.xid)}?apikey=${key}`;
    let response = await fetchWithTimeout(url, {}, 8000);
    // The source allows only a few requests a second: wait and try once more.
    for (let retry = 0; retry < 2 && response.status === 429; retry += 1) {
      await new Promise((resolve) => setTimeout(resolve, 600 * (retry + 1)));
      response = await fetchWithTimeout(url, {}, 8000);
    }
    if (!response.ok) return base;
    const parsed = details.safeParse(await response.json());
    if (!parsed.success) return base;
    const info = parsed.data;
    const image = info.preview ? thumb(info.preview.source) : undefined;
    const area = info.address?.suburb ?? info.address?.neighbourhood ?? info.address?.city;
    return {
      ...base,
      ...(info.wikipedia_extracts?.text ? { summary: shorten(info.wikipedia_extracts.text) } : {}),
      ...(image ? { image } : {}),
      ...(image && info.image?.startsWith('https://commons.wikimedia.org/') ? { imageSource: info.image } : {}),
      ...(info.wikipedia?.startsWith('https://') ? { wikipedia: info.wikipedia } : {}),
      ...(area ? { address: area } : {}),
    };
  } catch {
    return base; // the place is still real and usable without its description
  }
} // prettier-ignore

export async function GET(request: Request): Promise<Response> {
  const key = process.env.OPENTRIPMAP_API_KEY;
  if (!key) return problem(503, 'not_configured', 'The places service is not set up.');
  if (tooMany(request, 'places', 30, 60_000)) return problem(429, 'slow_down', 'Too many requests.');

  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return problem(400, 'bad_request', 'lat and lng are required.');
  const { lat, lng } = parsed.data;

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(cacheKey);
  const cacheHeader = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
  if (hit && Date.now() - hit.at < CACHE_MS) return json({ places: hit.places }, { cache: cacheHeader });

  try {
    // Famous places first; lesser-known ones and a wider area only if the list is thin.
    let found = await nearby(lat, lng, 12_000, 3, key);
    if (found.length < 30) found = await nearby(lat, lng, 12_000, 2, key);
    if (found.length < 12) found = await nearby(lat, lng, 35_000, 2, key);
    const described = (await mapLimit(shortlist(found), 4, (item) => describe(item, key))).filter(
      (place): place is PlaceCandidate => Boolean(place),
    );
    // Places we can show and describe come first; the order within each group is kept.
    const complete = (place: PlaceCandidate) => Number(Boolean(place.image)) + Number(Boolean(place.summary));
    const places = described
      .map((place, index) => ({ place, index }))
      .sort((a, b) => complete(b.place) - complete(a.place) || a.index - b.index)
      .slice(0, MAX_PLACES)
      .map(({ place }) => place);
    if (places.length > 0) cache.set(cacheKey, { at: Date.now(), places });
    return json({ places }, { cache: places.length > 0 ? cacheHeader : 'no-store' });
  } catch (error) {
    console.error('[api/places]', error instanceof Error ? error.message : error);
    return problem(502, 'upstream', 'The places service did not answer.');
  }
} // prettier-ignore
