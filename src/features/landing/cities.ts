import type { Place } from '@/services/geocoding';

const city = (
  slug: string,
  name: string,
  country: string,
  countryCode: string,
  lat: number,
  lng: number,
  timezone: string,
): Place => ({
  id: `cur:${slug}`,
  source: 'curated',
  name,
  country,
  countryCode,
  lat,
  lng,
  timezone,
});

/** Well-known cities with fixed coordinates: globe markers and one-tap picks. */
export const CITIES = {
  kualaLumpur: city('kuala-lumpur', 'Kuala Lumpur', 'Malaysia', 'MY', 3.139, 101.6869, 'Asia/Kuala_Lumpur'),
  kochi: city('kochi', 'Kochi', 'India', 'IN', 9.9312, 76.2673, 'Asia/Kolkata'),
  tokyo: city('tokyo', 'Tokyo', 'Japan', 'JP', 35.6762, 139.6503, 'Asia/Tokyo'),
  paris: city('paris', 'Paris', 'France', 'FR', 48.8566, 2.3522, 'Europe/Paris'),
  dubai: city('dubai', 'Dubai', 'United Arab Emirates', 'AE', 25.2048, 55.2708, 'Asia/Dubai'),
  singapore: city('singapore', 'Singapore', 'Singapore', 'SG', 1.3521, 103.8198, 'Asia/Singapore'),
  london: city('london', 'London', 'United Kingdom', 'GB', 51.5072, -0.1276, 'Europe/London'),
  newYork: city('new-york', 'New York', 'United States', 'US', 40.7128, -74.006, 'America/New_York'),
  sydney: city('sydney', 'Sydney', 'Australia', 'AU', -33.8688, 151.2093, 'Australia/Sydney'),
  cairo: city('cairo', 'Cairo', 'Egypt', 'EG', 30.0444, 31.2357, 'Africa/Cairo'),
  capeTown: city('cape-town', 'Cape Town', 'South Africa', 'ZA', -33.9249, 18.4241, 'Africa/Johannesburg'),
} as const; // prettier-ignore

/** Shown as quick picks under the search bar. */
export const POPULAR: Place[] = [CITIES.kualaLumpur, CITIES.kochi, CITIES.tokyo, CITIES.paris];

/** Flight arcs drawn on the globe. */
export const ROUTES: [Place, Place][] = [
  [CITIES.kochi, CITIES.kualaLumpur],
  [CITIES.kualaLumpur, CITIES.tokyo],
  [CITIES.dubai, CITIES.kochi],
  [CITIES.london, CITIES.dubai],
  [CITIES.newYork, CITIES.london],
  [CITIES.singapore, CITIES.sydney],
  [CITIES.paris, CITIES.cairo],
  [CITIES.cairo, CITIES.capeTown],
];

/** Wikipedia article for each city, where it differs from the city's name. */
const WIKI_TITLES: Record<string, string> = { 'cur:new-york': 'New York City' };
export const wikiTitle = (place: Place): string => WIKI_TITLES[place.id] ?? place.name;
