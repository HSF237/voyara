import { useForecast } from '@/services/queries';
import type { ForecastState } from './TripPass';

/** Forecast for a trip plus the single word the UI needs to describe its state. */
export function useTripForecast(
  place: { lat: number; lng: number } | null | undefined,
  startDate: string,
  endDate: string,
) {
  const forecast = useForecast(place, startDate, endDate);
  let state: ForecastState;
  if (!place) state = 'none';
  else if (!forecast.window) state = 'later';
  else if (forecast.isError) state = 'error';
  else if (forecast.data) state = 'ready';
  else state = 'loading';
  return { days: forecast.data, state };
}
