import * as z from 'zod/mini';
import { env } from '@/lib/env';
import { fetchJson, ServiceError } from './http';

/** A destination the user can plan a trip to. Always comes from a data source. */
export type Place = {
  /** Source-prefixed id, e.g. "om:1733046" (Open-Meteo / GeoNames) or "mt:region.1677". */
  id: string;
  source: 'open-meteo' | 'maptiler' | 'curated';
  name: string;
  /** State or province, when the source knows it. */
  region?: string;
  country: string;
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: string;
  lat: number;
  lng: number;
  /** IANA time zone, e.g. "Asia/Kuala_Lumpur". */
  timezone?: string;
};

export const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 6;

// ── Open-Meteo geocoding (GeoNames data, no key) ────────────────────────────
const openMeteoSchema = z.object({
  results: z.optional(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.optional(z.string()),
        country: z.optional(z.string()),
        admin1: z.optional(z.string()),
        timezone: z.optional(z.string()),
      }),
    ),
  ),
});

async function searchOpenMeteo(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(MAX_RESULTS + 2));
  url.searchParams.set('language', language);
  url.searchParams.set('format', 'json');

  const data = await fetchJson(url.toString(), openMeteoSchema, { signal, timeoutMs: 6000 });
  return (data.results ?? [])
    .filter((item) => item.country_code && item.country)
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      id: `om:${item.id}`,
      source: 'open-meteo' as const,
      name: item.name,
      region: item.admin1 && item.admin1 !== item.name ? item.admin1 : undefined,
      country: item.country ?? '',
      countryCode: (item.country_code ?? '').toUpperCase(),
      lat: item.latitude,
      lng: item.longitude,
      timezone: item.timezone,
    }));
}

// ── MapTiler geocoding (fallback; needs VITE_MAPTILER_KEY) ──────────────────
const mapTilerSchema = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      center: z.tuple([z.number(), z.number()]),
      properties: z.optional(z.object({ country_code: z.optional(z.string()) })),
      context: z.optional(
        z.array(
          z.object({ id: z.string(), text: z.string(), country_code: z.optional(z.string()) }),
        ),
      ),
    }),
  ),
});

async function searchMapTiler(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const key = env.raw.VITE_MAPTILER_KEY;
  if (!key) throw new ServiceError('MapTiler key not configured', 'http');

  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`);
  url.searchParams.set('key', key);
  url.searchParams.set('limit', String(MAX_RESULTS));
  url.searchParams.set('language', language);
  url.searchParams.set('types', 'municipality,place,region,county');

  const data = await fetchJson(url.toString(), mapTilerSchema, { signal, timeoutMs: 6000 });
  const places: Place[] = [];
  for (const feature of data.features) {
    const context = feature.context ?? [];
    const countryEntry = context.find((entry) => entry.id.startsWith('country.'));
    const regionEntry = context.find((entry) => entry.id.startsWith('region.'));
    const countryCode = feature.properties?.country_code ?? countryEntry?.country_code;
    if (!countryCode || !countryEntry) continue;
    places.push({
      id: `mt:${feature.id}`,
      source: 'maptiler',
      name: feature.text,
      region: regionEntry && regionEntry.text !== feature.text ? regionEntry.text : undefined,
      country: countryEntry.text,
      countryCode: countryCode.toUpperCase(),
      lat: feature.center[1],
      lng: feature.center[0],
    });
  }
  return places;
}

/**
 * Search for a destination. Open-Meteo answers first (no key, includes the
 * time zone); if it is down or rate-limited, MapTiler takes over.
 */
export async function searchPlaces(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  try {
    return await searchOpenMeteo(trimmed, language, signal);
  } catch (error) {
    if (error instanceof ServiceError && error.kind === 'aborted') throw error;
    if (!env.features.maps) throw error;
    return searchMapTiler(trimmed, language, signal);
  }
}

/** "MY" → "🇲🇾". Regional-indicator letters; no image or network needed. */
export function flagEmoji(countryCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return '';
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

export function placeLabel(place: Place): string {
  return [place.name, place.region, place.country].filter(Boolean).join(', ');
}
