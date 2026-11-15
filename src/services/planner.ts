import * as z from 'zod/mini';
import type { Trip, TripPicks } from '@/features/trip/model';
import { daysOfTrip } from '@/lib/dates';
import { scorePlace } from '@/planner/categories';
import { buildPlan, type PlanInput } from '@/planner/optimise';
import { CATEGORIES, type Plan, type PlaceCandidate } from '@/planner/types';
import { fetchJson } from './http';

const text = z.optional(z.string());

const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: z.enum(CATEGORIES),
  rating: z.number(),
  durationMin: z.number(),
  summary: text,
  image: text,
  imageSource: text,
  wikipedia: text,
  address: text,
});

const placesSchema = z.object({ places: z.array(placeSchema) });

const clockTime = z.string().check(z.regex(/^\d{2}:\d{2}$/));
const planSchema = z.object({
  plan: z.object({
    days: z.array(
      z.object({
        date: z.string(),
        theme: text,
        lunchAt: z.optional(clockTime),
        stops: z.array(
          z.object({
            placeId: z.string(),
            start: clockTime,
            end: clockTime,
            travelMin: z.number(),
            travelKm: z.number(),
            travelMode: z.enum(['walk', 'drive']),
            tip: text,
          }),
        ),
      }),
    ),
    source: z.enum(['ai', 'rules']),
    model: text,
    summary: text,
    generatedAt: z.string(),
  }),
});

/** Real places to visit around a destination. Looking them up can take a few seconds. */
export async function getPlaces(
  place: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<PlaceCandidate[]> {
  const url = `/api/places?lat=${place.lat.toFixed(4)}&lng=${place.lng.toFixed(4)}`;
  const result = await fetchJson(url, placesSchema, { signal, timeoutMs: 45_000, retries: 1 });
  return result.places;
}

/** What both planners (the AI one on the server, the built-in one here) work from. */
export function planInputFor(trip: Trip, picks: TripPicks): PlanInput {
  return {
    places: picks.places,
    mustIds: picks.mustIds,
    dates: daysOfTrip(trip.startDate, trip.endDate),
    pace: trip.pace,
    score: (place) => scorePlace(place, trip.interests),
  };
}

/**
 * Builds the day-by-day plan. Asks the AI planner first; if it cannot be
 * reached, or sends anything that refers to a place we did not give it, the
 * built-in planner answers on this device instead. Always resolves to a plan.
 */
export async function makePlan(
  trip: Trip,
  picks: TripPicks,
  language: string,
  signal?: AbortSignal,
): Promise<Plan> {
  const input = planInputFor(trip, picks);
  const known = new Set(picks.places.map((place) => place.id));
  try {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 60_000);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          destination: { name: trip.destination.name, country: trip.destination.country },
          dates: input.dates,
          pace: trip.pace,
          interests: trip.interests,
          travellers: trip.travellers,
          language,
          places: picks.places.map(({ id, name, lat, lng, category, rating, durationMin }) => ({
            id,
            name,
            lat,
            lng,
            category,
            rating,
            durationMin,
          })),
          mustIds: picks.mustIds,
        }),
      });
      if (!response.ok) throw new Error(`plan service answered ${response.status}`);
      const parsed = planSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('plan service sent an unexpected shape');
      const plan = parsed.data.plan as Plan;
      const stops = plan.days.flatMap((day) => day.stops);
      if (stops.length === 0 || stops.some((stop) => !known.has(stop.placeId))) {
        throw new Error('plan refers to unknown places');
      }
      return plan;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn('AI planner unavailable; using the built-in planner.', error);
    return buildPlan(input);
  }
}
