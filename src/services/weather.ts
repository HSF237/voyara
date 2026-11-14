import { addDays, differenceInCalendarDays } from 'date-fns';
import * as z from 'zod/mini';
import { parseISODate, toISODate } from '@/lib/dates';
import { fetchJson } from './http';

/** Daily forecast from Open-Meteo (no key). Hourly data arrives with live re-planning. */
export type WeatherKind =
  'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export type DayForecast = {
  date: string;
  kind: WeatherKind;
  tempMax: number;
  tempMin: number;
  /** 0–100, or null when the model does not provide it. */
  rainChance: number | null;
};

/** Open-Meteo publishes 16 days: today plus the next 15. */
export const FORECAST_DAYS = 16;

/** WMO weather interpretation codes → the handful of states the UI draws. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

/**
 * The part of a trip the forecast can cover, or null if the trip starts after
 * the forecast horizon (or is already over).
 */
export function forecastWindow(
  startDate: string,
  endDate: string,
  today: Date,
): { start: string; end: string } | null {
  const first = parseISODate(startDate);
  const last = parseISODate(endDate);
  const horizon = addDays(today, FORECAST_DAYS - 1);
  if (differenceInCalendarDays(first, horizon) > 0) return null;
  if (differenceInCalendarDays(last, today) < 0) return null;
  const start = differenceInCalendarDays(first, today) < 0 ? today : first;
  const end = differenceInCalendarDays(last, horizon) > 0 ? horizon : last;
  return { start: toISODate(start), end: toISODate(end) };
}

const numbers = z.array(z.nullable(z.number()));
const forecastSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    weather_code: numbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
    precipitation_probability_max: z.optional(numbers),
  }),
});

export async function getDailyForecast(
  place: { lat: number; lng: number },
  window: { start: string; end: string },
  units: 'metric' | 'imperial',
  signal?: AbortSignal,
): Promise<DayForecast[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', place.lat.toFixed(4));
  url.searchParams.set('longitude', place.lng.toFixed(4));
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', window.start);
  url.searchParams.set('end_date', window.end);
  if (units === 'imperial') url.searchParams.set('temperature_unit', 'fahrenheit');

  const { daily } = await fetchJson(url.toString(), forecastSchema, { signal });
  const days: DayForecast[] = [];
  daily.time.forEach((date, index) => {
    const code = daily.weather_code[index];
    const tempMax = daily.temperature_2m_max[index];
    const tempMin = daily.temperature_2m_min[index];
    // A day with holes in it is left out rather than shown with made-up values.
    if (code == null || tempMax == null || tempMin == null) return;
    days.push({
      date,
      kind: weatherKind(code),
      tempMax,
      tempMin,
      rainChance: daily.precipitation_probability_max?.[index] ?? null,
    });
  });
  return days;
}
