import { centroid, distanceKm, estimateLeg, routeKm, type Point } from './geo.js';
import type { DayOutline, DayPlan, Plan, PlaceCandidate, PlannerPace, PlanStop } from './types.js';

/** How full a day is at each pace. */
export const PACE_RULES: Record<PlannerPace, { stopsPerDay: number; startAt: number }> = {
  relaxed: { stopsPerDay: 3, startAt: 10 * 60 },
  balanced: { stopsPerDay: 4, startAt: 9 * 60 + 30 },
  packed: { stopsPerDay: 6, startAt: 8 * 60 + 30 },
};

const LUNCH_FROM = 12 * 60 + 15;
const LUNCH_MIN = 60;
const EVENING_FROM = 18 * 60 + 30;

export const clock = (minutes: number): string => {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

/** Shortens a route by reversing stretches of it until no reversal helps (2-opt). */
export function shortenRoute<T extends Point>(route: T[]): T[] {
  const best = [...route];
  if (best.length < 4) return best;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const before = distanceKm(best[i - 1]!, best[i]!) + (best[j + 1] ? distanceKm(best[j]!, best[j + 1]!) : 0);
        const after = distanceKm(best[i - 1]!, best[j]!) + (best[j + 1] ? distanceKm(best[i]!, best[j + 1]!) : 0);
        if (after + 1e-9 < before) {
          best.splice(i, j - i + 1, ...best.slice(i, j + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return best;
} // prettier-ignore

/** Orders one day's places: nearest neighbour from the given start, then 2-opt. Evening places go last. */
export function orderDay<T extends PlaceCandidate>(places: T[], from: Point): T[] {
  const daytime = places.filter((place) => place.category !== 'nightlife');
  const evening = places.filter((place) => place.category === 'nightlife');
  const route: T[] = [];
  const left = [...daytime];
  let here: Point = from;
  while (left.length > 0) {
    let nearest = 0;
    for (let index = 1; index < left.length; index += 1) {
      if (distanceKm(here, left[index]!) < distanceKm(here, left[nearest]!)) nearest = index;
    }
    const [next] = left.splice(nearest, 1);
    route.push(next!);
    here = next!;
  }
  return [...shortenRoute(route), ...evening];
}

/**
 * Splits places into days so each day stays in one part of town: seeds as far
 * apart as possible, then every place joins the nearest day that has room.
 */
export function groupIntoDays<T extends PlaceCandidate>(places: T[], dayCount: number, perDay: number): T[][] {
  const groups = Math.max(1, Math.min(dayCount, Math.ceil(places.length / perDay), places.length));
  if (places.length === 0) return [];
  const middle = centroid(places);
  const seeds: T[] = [
    places.reduce((far, place) => (distanceKm(middle, place) > distanceKm(middle, far) ? place : far)),
  ];
  while (seeds.length < groups) {
    const spread = (place: T) => Math.min(...seeds.map((seed) => distanceKm(seed, place)));
    seeds.push(
      places
        .filter((place) => !seeds.includes(place))
        .reduce((far, place) => (spread(place) > spread(far) ? place : far)),
    );
  }
  const days: T[][] = seeds.map((seed) => [seed]);
  const capacity = Math.max(perDay, Math.ceil(places.length / groups));
  // Places with the clearest "home" day are placed first, so they are not crowded out.
  const rest = places
    .filter((place) => !seeds.includes(place))
    .map((place) => {
      const gaps = seeds.map((seed) => distanceKm(seed, place)).sort((a, b) => a - b);
      return { place, margin: (gaps[1] ?? gaps[0]!) - gaps[0]! };
    })
    .sort((a, b) => b.margin - a.margin);
  for (const { place } of rest) {
    const order = seeds
      .map((seed, index) => ({ index, gap: distanceKm(seed, place) }))
      .sort((a, b) => a.gap - b.gap);
    const home = order.find(({ index }) => days[index]!.length < capacity) ?? order[0]!;
    days[home.index]!.push(place);
  }
  return days;
} // prettier-ignore

/** Gives one day's ordered places their times, travel legs and lunch break. */
export function scheduleDay(
  date: string,
  places: PlaceCandidate[],
  pace: PlannerPace,
  extras: { theme?: string; tips?: Record<string, string | undefined> } = {},
): DayPlan {
  let now = PACE_RULES[pace].startAt;
  let lunchAt: string | undefined;
  const stops: PlanStop[] = [];
  places.forEach((place, index) => {
    const previous = places[index - 1];
    const leg = previous ? estimateLeg(previous, place) : { km: 0, minutes: 0, mode: 'walk' as const };
    now += leg.minutes;
    if (!lunchAt && index > 0 && now >= LUNCH_FROM && place.category !== 'food') {
      lunchAt = clock(now);
      now += LUNCH_MIN;
    }
    if (place.category === 'nightlife') now = Math.max(now, EVENING_FROM);
    const start = now;
    now += place.durationMin;
    const tip = extras.tips?.[place.id];
    stops.push({
      placeId: place.id,
      start: clock(start),
      end: clock(now),
      travelMin: leg.minutes,
      travelKm: Math.round(leg.km * 10) / 10,
      travelMode: leg.mode,
      ...(tip ? { tip } : {}),
    });
  });
  return { date, ...(extras.theme ? { theme: extras.theme } : {}), ...(lunchAt ? { lunchAt } : {}), stops };
} // prettier-ignore

export type PlanInput = {
  places: PlaceCandidate[];
  /** Places the traveller marked as must-do: never dropped. */
  mustIds: readonly string[];
  /** Trip days, "yyyy-MM-dd". */
  dates: readonly string[];
  pace: PlannerPace;
  /** Scores for choosing what to drop when there are more places than time. */
  score?: (place: PlaceCandidate) => number;
};

/** Trims the list to what fits the trip: must-dos first, then the best of the rest. */
export function choosePlaces(input: PlanInput): PlaceCandidate[] {
  const capacity = input.dates.length * PACE_RULES[input.pace].stopsPerDay;
  const must = new Set(input.mustIds);
  const score = input.score ?? ((place: PlaceCandidate) => place.rating);
  return [...input.places]
    .sort((a, b) => Number(must.has(b.id)) - Number(must.has(a.id)) || score(b) - score(a))
    .slice(0, Math.max(capacity, must.size));
}

/** The built-in planner: no AI needed. Groups by area, orders to cut travel, then schedules. */
export function buildPlan(input: PlanInput, now: Date = new Date()): Plan {
  const chosen = choosePlaces(input);
  const perDay = PACE_RULES[input.pace].stopsPerDay;
  const middle = centroid(input.places);
  const groups = groupIntoDays(chosen, input.dates.length, perDay)
    .map((group) => orderDay(group, middle))
    // Fullest days first, so a short trip never opens with a thin day.
    .sort((a, b) => b.length - a.length);
  const days = input.dates.map((date, index) => scheduleDay(date, groups[index] ?? [], input.pace));
  return { days, source: 'rules', generatedAt: now.toISOString() };
}

/**
 * Turns the AI planner's outline into a plan we can trust: unknown or repeated
 * ids are dropped, missing must-dos are added to the nearest day, each day's
 * order is tightened, and every time is worked out here — never by the AI.
 * Returns null when too little of the outline is usable.
 */
export function planFromOutline(
  outline: DayOutline[],
  input: PlanInput,
  meta: { model?: string; summary?: string } = {},
  now: Date = new Date(),
): Plan | null {
  const byId = new Map(input.places.map((place) => [place.id, place]));
  const used = new Set<string>();
  const tips: Record<string, string | undefined> = {};
  const days: PlaceCandidate[][] = input.dates.map(() => []);
  const themes: (string | undefined)[] = [];

  outline.slice(0, input.dates.length).forEach((day, index) => {
    themes[index] = day.theme?.trim().slice(0, 60) || undefined;
    for (const stop of day.stops) {
      const place = byId.get(stop.id);
      if (!place || used.has(place.id)) continue;
      used.add(place.id);
      tips[place.id] = stop.tip?.trim().slice(0, 160) || undefined;
      days[index]!.push(place);
    }
  });

  for (const id of input.mustIds) {
    const place = byId.get(id);
    if (!place || used.has(id)) continue;
    used.add(id);
    const nearest = days
      .map((day, index) => ({
        index,
        gap: day.length ? distanceKm(centroid(day), place) : Infinity,
      }))
      .sort((a, b) => a.gap - b.gap || days[a.index]!.length - days[b.index]!.length)[0];
    days[nearest?.index ?? 0]!.push(place);
  }

  const expected = Math.min(choosePlaces(input).length, input.places.length);
  if (used.size === 0 || used.size < Math.ceil(expected / 2)) return null;

  const middle = centroid(input.places);
  const eveningLast = (list: PlaceCandidate[]) => [
    ...list.filter((place) => place.category !== 'nightlife'),
    ...list.filter((place) => place.category === 'nightlife'),
  ];
  const planned = input.dates.map((date, index) => {
    const asGiven = eveningLast(days[index]!);
    const tightened = orderDay(asGiven, asGiven[0] ?? middle);
    // Keep the AI's order unless ours is clearly shorter.
    const ordered = routeKm(tightened) < routeKm(asGiven) * 0.9 ? tightened : asGiven;
    return scheduleDay(date, ordered, input.pace, { theme: themes[index], tips });
  });

  return {
    days: planned,
    source: 'ai',
    ...(meta.model ? { model: meta.model } : {}),
    ...(meta.summary ? { summary: meta.summary.trim().slice(0, 400) } : {}),
    generatedAt: now.toISOString(),
  };
}

/** Re-times a day after the traveller reorders or removes stops. Tips and theme are kept. */
export function rescheduleDay(day: DayPlan, orderedIds: string[], places: PlaceCandidate[], pace: PlannerPace): DayPlan {
  const byId = new Map(places.map((place) => [place.id, place]));
  const tips = Object.fromEntries(day.stops.map((stop) => [stop.placeId, stop.tip]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((place): place is PlaceCandidate => Boolean(place));
  return scheduleDay(day.date, ordered, pace, { theme: day.theme, tips });
} // prettier-ignore
