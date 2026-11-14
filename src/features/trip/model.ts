import type { Place } from '@/services/geocoding';

export const PACES = ['relaxed', 'balanced', 'packed'] as const;
export type Pace = (typeof PACES)[number];

export const INTERESTS = [
  'food',
  'nature',
  'history',
  'shopping',
  'nightlife',
  'adventure',
  'family',
  'religious',
  'photography',
] as const;
export type Interest = (typeof INTERESTS)[number];

export const MAX_TRAVELLERS = 20;
/** Longest trip the planner handles, in nights. */
export const MAX_NIGHTS = 13;

/** Everything the planner needs to know before it picks places. */
export type TripDetails = {
  destination: Place;
  /** "yyyy-MM-dd" calendar days, both included. */
  startDate: string;
  endDate: string;
  travellers: number;
  /** Total for the whole group, in `budgetCurrency` (the traveller's home currency). */
  budget: number;
  budgetCurrency: string;
  pace: Pace;
  /** Empty means "a bit of everything". */
  interests: Interest[];
};

export type Trip = TripDetails & {
  id: string;
  /** Short human-friendly reference shown on the trip pass, e.g. "VY-7K2QF". */
  code: string;
  createdAt: string;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I)

export function makeTripCode(random: () => number = Math.random): string {
  let code = '';
  for (let index = 0; index < 5; index += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `VY-${code}`;
}

export function makeTripId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
