import { differenceInCalendarDays } from 'date-fns';
import type { Trip } from '@/features/trip/model';
import { nightsBetween, parseISODate } from '@/lib/dates';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** Trips that have not ended yet, soonest first. */
export function upcomingTrips(trips: Trip[], today: string): Trip[] {
  return trips
    .filter((trip) => trip.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Trips that are over, most recent first. */
export function pastTrips(trips: Trip[], today: string): Trip[] {
  return trips
    .filter((trip) => trip.endDate < today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/** Whole days until a trip starts; 0 or less means it is under way. */
export function daysUntil(trip: Trip, today: string): number {
  return differenceInCalendarDays(parseISODate(trip.startDate), parseISODate(today));
}

export function tripStats(trips: Trip[]): { trips: number; countries: number; nights: number } {
  return {
    trips: trips.length,
    countries: new Set(trips.map((trip) => trip.destination.countryCode)).size,
    nights: trips.reduce((sum, trip) => sum + nightsBetween(trip.startDate, trip.endDate), 0),
  };
}
