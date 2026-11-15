import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startOfToday } from '@/lib/dates';
import { useSettings } from '@/store/settings';
import { getRates } from './currency';
import { MIN_QUERY_LENGTH, searchPlaces } from './geocoding';
import { ServiceError } from './http';
import { forecastWindow, getDailyForecast } from './weather';
import { findPlacePhoto } from './wiki';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** The value, but only after it has stopped changing for `delayMs`. */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const noRetryWhenCancelled = (count: number, error: Error) =>
  !(error instanceof ServiceError && error.kind === 'aborted') && count < 1;

/** Destination autocomplete. Pass the debounced text. */
export function usePlaceSearch(query: string) {
  const { i18n } = useTranslation();
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['places', i18n.language, trimmed.toLowerCase()],
    queryFn: ({ signal }) => searchPlaces(trimmed, i18n.language, signal),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: HOUR,
    placeholderData: keepPreviousData,
    retry: noRetryWhenCancelled,
  });
}

/** Exchange rates from `base` to each of `quotes`. Refreshed a few times a day at most. */
export function useRates(base: string, quotes: readonly (string | undefined)[]) {
  // A stable string key, so a new array with the same currencies doesn't refetch.
  const key = [...new Set(quotes.filter((quote) => quote && quote !== base))].sort().join(',');
  const wanted = useMemo(() => (key ? key.split(',') : []), [key]);
  return useQuery({
    queryKey: ['rates', base, wanted],
    queryFn: ({ signal }) => getRates(base, wanted, signal),
    enabled: wanted.length > 0,
    staleTime: 6 * HOUR,
    retry: noRetryWhenCancelled,
  });
}

/** Daily forecast for the part of a trip that falls inside the forecast horizon. */
export function useForecast(
  place: { lat: number; lng: number } | null | undefined,
  startDate: string,
  endDate: string,
) {
  const units = useSettings((state) => state.units);
  const window = useMemo(
    () => forecastWindow(startDate, endDate, startOfToday()),
    [startDate, endDate],
  );
  const query = useQuery({
    queryKey: ['forecast', place?.lat, place?.lng, window?.start, window?.end, units],
    queryFn: ({ signal }) => {
      if (!place || !window) return [];
      return getDailyForecast(place, window, units, signal);
    },
    enabled: Boolean(place && window),
    staleTime: 30 * MINUTE,
    retry: noRetryWhenCancelled,
  });
  return { ...query, window, units };
}

/** A photo for any destination, found by name. Null when Wikipedia has no free image. */
export function usePlacePhoto(place: { name: string; country: string } | null | undefined) {
  const search = place ? `${place.name} ${place.country}` : '';
  return useQuery({
    queryKey: ['photo', search],
    queryFn: ({ signal }) => findPlacePhoto(search, signal),
    enabled: search.length > 0,
    staleTime: 24 * HOUR,
    gcTime: 24 * HOUR,
    retry: false,
  });
}
