import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  makeTripCode,
  makeTripId,
  type Trip,
  type TripDetails,
  type TripPicks,
} from '@/features/trip/model';
import type { Plan } from '@/planner/types';

type TripsState = {
  trips: Trip[];
  addTrip: (details: TripDetails) => Trip;
  updateTrip: (id: string, details: TripDetails) => Trip | undefined;
  removeTrip: (id: string) => void;
  /** Saves the swipe-deck choices. The old plan no longer matches, so it is dropped. */
  savePicks: (id: string, picks: TripPicks) => void;
  savePlan: (id: string, plan: Plan | undefined) => void;
};

const patch = (trips: Trip[], id: string, change: (trip: Trip) => Trip) =>
  trips.map((trip) => (trip.id === id ? change(trip) : trip));

/** Saved trips, kept on this device. Cloud sync arrives with group mode. */
export const useTrips = create<TripsState>()(
  persist(
    (set, get) => ({
      trips: [],
      addTrip: (details) => {
        const trip: Trip = {
          ...details,
          id: makeTripId(),
          code: makeTripCode(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ trips: [trip, ...state.trips] }));
        return trip;
      },
      updateTrip: (id, details) => {
        const existing = get().trips.find((trip) => trip.id === id);
        if (!existing) return undefined;
        const moved = existing.destination.id !== details.destination.id;
        const reshaped =
          moved ||
          existing.startDate !== details.startDate ||
          existing.endDate !== details.endDate ||
          existing.pace !== details.pace;
        // A new destination makes the picked places meaningless; new dates or pace only the plan.
        const updated: Trip = {
          ...existing,
          ...details,
          picks: moved ? undefined : existing.picks,
          plan: reshaped ? undefined : existing.plan,
        };
        set((state) => ({ trips: patch(state.trips, id, () => updated) }));
        return updated;
      },
      removeTrip: (id) => set((state) => ({ trips: state.trips.filter((trip) => trip.id !== id) })),
      savePicks: (id, picks) =>
        set((state) => ({
          trips: patch(state.trips, id, (trip) => ({ ...trip, picks, plan: undefined })),
        })),
      savePlan: (id, plan) =>
        set((state) => ({ trips: patch(state.trips, id, (trip) => ({ ...trip, plan })) })),
    }),
    { name: 'voyara.trips', version: 1 },
  ),
);
