import { afterEach, describe, expect, it, vi } from 'vitest';
import { flagEmoji, placeLabel, searchPlaces } from '@/services/geocoding';
import mapTiler from '../fixtures/maptiler-geocoding.json';
import openMeteo from '../fixtures/open-meteo-geocoding.json';

// Never use a real key in tests, and make the MapTiler fallback available.
vi.mock('@/lib/env', () => ({
  env: {
    raw: { VITE_MAPTILER_KEY: 'test-key' },
    appUrl: 'http://localhost',
    features: { firebase: false, maps: true },
  },
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

/** The fixtures are real responses recorded from each service. */
describe('searchPlaces', () => {
  it('maps Open-Meteo results to places', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(openMeteo));
    vi.stubGlobal('fetch', fetchMock);

    const places = await searchPlaces('Kochi', 'en');
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.hostname).toBe('geocoding-api.open-meteo.com');
    expect(url.searchParams.get('name')).toBe('Kochi');

    const india = places.find((place) => place.countryCode === 'IN');
    expect(india).toMatchObject({
      id: 'om:1273874',
      source: 'open-meteo',
      name: 'Kochi',
      region: 'Kerala',
      country: 'India',
      timezone: 'Asia/Kolkata',
    });
    expect(india?.lat).toBeCloseTo(9.94, 1);
    expect(india?.lng).toBeCloseTo(76.26, 1);
    expect(places.length).toBeLessThanOrEqual(6);
    for (const place of places) expect(place.countryCode).toMatch(/^[A-Z]{2}$/);
  });

  it('does not call the network for very short queries', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchPlaces(' k ', 'en')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an empty list when nothing matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ generationtime_ms: 0.4 })));
    await expect(searchPlaces('zzzzqqq', 'en')).resolves.toEqual([]);
  });

  it('falls back to MapTiler when Open-Meteo is down', async () => {
    const fetchMock = vi.fn((input: string) =>
      Promise.resolve(input.includes('open-meteo') ? json({}, 429) : json(mapTiler)),
    );
    vi.stubGlobal('fetch', fetchMock);

    const places = await searchPlaces('kuala lumpur', 'en');
    expect(places[0]).toMatchObject({
      source: 'maptiler',
      name: 'Kuala Lumpur',
      country: 'Malaysia',
      countryCode: 'MY',
    });
    expect(places[0]?.lat).toBeCloseTo(3.15, 1);
    expect(places[0]?.lng).toBeCloseTo(101.69, 1);
    const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(lastUrl).toContain('api.maptiler.com/geocoding/kuala%20lumpur.json');
  });
});

describe('place helpers', () => {
  it('builds a flag from a country code', () => {
    expect(flagEmoji('MY')).toBe('🇲🇾');
    expect(flagEmoji('in')).toBe('🇮🇳');
    expect(flagEmoji('???')).toBe('');
  });

  it('labels a place with its region and country', () => {
    expect(
      placeLabel({
        id: 'x',
        source: 'curated',
        name: 'Kochi',
        region: 'Kerala',
        country: 'India',
        countryCode: 'IN',
        lat: 0,
        lng: 0,
      }),
    ).toBe('Kochi, Kerala, India');
  });
});
