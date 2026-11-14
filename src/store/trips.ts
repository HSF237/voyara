import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { makeTripCode, makeTripId, type Trip, type TripDetails } from '@/features/trip/model';

type TripsState = {
  trips: Trip[];
  addTrip: (details: TripDetails) => Trip;
  updateTrip: (id: string, details: TripDetails) => Trip | undefined;
  removeTrip: (id: string) => void;
};

/** Saved trips, kept on this device. Cloud sync arrives with accounts. */
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
        const updated: Trip = { ...existing, ...details };
        set((state) => ({ trips: state.trips.map((trip) => (trip.id === id ? updated : trip)) }));
        return updated;
      },
      removeTrip: (id) => set((state) => ({ trips: state.trips.filter((trip) => trip.id !== id) })),
    }),
    { name: 'voyara.trips', version: 1 },
  ),
);
