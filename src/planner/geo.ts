import type { TravelMode } from './types.js';

export type Point = { lat: number; lng: number };

const EARTH_KM = 6371;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Streets are never straight: real routes run about a third longer than the crow flies. */
const DETOUR = 1.35;
const WALK_KMH = 4.6;
const DRIVE_KMH = 22; // city traffic, door to door
const DRIVE_OVERHEAD_MIN = 6; // finding the ride, parking, walking in
const WALKABLE_KM = 1.2;

export type Leg = { km: number; minutes: number; mode: TravelMode };

/** An estimate of getting from one place to the next. Refined by a routing service when online. */
export function estimateLeg(from: Point, to: Point): Leg {
  const km = distanceKm(from, to) * DETOUR;
  if (km <= WALKABLE_KM) {
    return { km, minutes: Math.max(2, Math.round((km / WALK_KMH) * 60)), mode: 'walk' };
  }
  return {
    km,
    minutes: Math.round((km / DRIVE_KMH) * 60 + DRIVE_OVERHEAD_MIN),
    mode: 'drive',
  };
}

export function centroid(points: Point[]): Point {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const sum = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    {
      lat: 0,
      lng: 0,
    },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Length of a route visiting the points in order, in kilometres. */
export function routeKm(points: Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceKm(points[index - 1]!, points[index]!);
  }
  return total;
}
