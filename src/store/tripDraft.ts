import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_TRAVELLERS, type Interest, type Pace, type Trip } from '@/features/trip/model';
import { defaultTripDates, startOfToday } from '@/lib/dates';
import type { Place } from '@/services/geocoding';

/**
 * The trip being set up. Kept for the browser session, so going from the
 * landing page to setup — or an accidental refresh — doesn't lose anything.
 */
export type TripDraft = {
  destination: Place | null;
  startDate: string;
  endDate: string;
  travellers: number;
  /** null = "follow the suggested budget" until the person moves the slider. */
  budget: number | null;
  pace: Pace;
  interests: Interest[];
  /** Set when editing a saved trip, so "Plan it" updates instead of duplicating. */
  editingId: string | null;
};

type DraftActions = {
  setDestination: (destination: Place | null) => void;
  setDates: (range: { startDate: string; endDate: string }) => void;
  setTravellers: (travellers: number) => void;
  setBudget: (budget: number | null) => void;
  setPace: (pace: Pace) => void;
  toggleInterest: (interest: Interest) => void;
  loadTrip: (trip: Trip) => void;
  reset: () => void;
};

export function freshDraft(): TripDraft {
  return {
    destination: null,
    ...defaultTripDates(startOfToday()),
    travellers: 2,
    budget: null,
    pace: 'balanced',
    interests: [],
    editingId: null,
  };
}

export const useTripDraft = create<TripDraft & DraftActions>()(
  persist(
    (set) => ({
      ...freshDraft(),
      setDestination: (destination) => set({ destination }),
      setDates: (range) => set(range),
      setTravellers: (travellers) =>
        set({ travellers: Math.min(MAX_TRAVELLERS, Math.max(1, Math.round(travellers))) }),
      setBudget: (budget) => set({ budget }),
      setPace: (pace) => set({ pace }),
      toggleInterest: (interest) =>
        set((state) => ({
          interests: state.interests.includes(interest)
            ? state.interests.filter((item) => item !== interest)
            : [...state.interests, interest],
        })),
      loadTrip: (trip) =>
        set({
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          travellers: trip.travellers,
          budget: trip.budget,
          pace: trip.pace,
          interests: trip.interests,
          editingId: trip.id,
        }),
      reset: () => set(freshDraft()),
    }),
    {
      name: 'voyara.draft',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // A draft left over from an earlier day may start in the past: refresh its dates.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<TripDraft>;
        const merged = { ...current, ...saved };
        const today = defaultTripDates(startOfToday());
        const stale =
          typeof merged.startDate !== 'string' ||
          merged.startDate < new Date().toISOString().slice(0, 10);
        return stale ? { ...merged, ...today } : merged;
      },
    },
  ),
);
