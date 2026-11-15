import { PACE_RULES } from './optimise.js';
import type { Category, DayPlan, PlaceCandidate, PlannerPace } from './types.js';

/** Things worth a second look in a day. Worked out from the plan itself; no AI involved. */
export type DayNotice =
  | { code: 'rain'; chance: number; outdoor: number }
  | { code: 'late'; ends: string }
  | { code: 'travel'; minutes: number }
  | { code: 'packed'; stops: number; limit: number }
  | { code: 'longHop'; minutes: number; placeId: string };

const OUTDOOR = new Set<Category>(['nature', 'views', 'adventure']);
const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));

export function checkDay(
  day: DayPlan,
  places: readonly PlaceCandidate[],
  pace: PlannerPace,
  weather?: { rainChance: number | null } | null,
): DayNotice[] {
  const notices: DayNotice[] = [];
  const byId = new Map(places.map((place) => [place.id, place]));
  const stops = day.stops.filter((stop) => byId.has(stop.placeId));
  if (stops.length === 0) return notices;

  const outdoor = stops.filter((stop) => OUTDOOR.has(byId.get(stop.placeId)!.category)).length;
  if (weather?.rainChance != null && weather.rainChance >= 60 && outdoor > 0) {
    notices.push({ code: 'rain', chance: Math.round(weather.rainChance), outdoor });
  }

  const limit = PACE_RULES[pace].stopsPerDay;
  if (stops.length > limit) notices.push({ code: 'packed', stops: stops.length, limit });

  const travel = stops.reduce((sum, stop) => sum + stop.travelMin, 0);
  const longest = stops.reduce((far, stop) => (stop.travelMin > far.travelMin ? stop : far));
  if (longest.travelMin >= 45) {
    notices.push({ code: 'longHop', minutes: longest.travelMin, placeId: longest.placeId });
  } else if (travel >= 90) {
    notices.push({ code: 'travel', minutes: travel });
  }

  // A day that runs late is fine when it ends somewhere meant for the evening.
  const last = stops.at(-1)!;
  const start = minutes(stops[0]!.start);
  const end = minutes(last.end) < start ? minutes(last.end) + 1440 : minutes(last.end);
  if (end > 20 * 60 + 30 && byId.get(last.placeId)!.category !== 'nightlife') {
    notices.push({ code: 'late', ends: last.end });
  }
  return notices;
}
