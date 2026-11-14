import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Who is using the app. Guests exist only on this device; Google users come from Firebase. */
export type AppUser = {
  uid: string;
  name: string;
  provider: 'google' | 'guest';
  email?: string;
  photoURL?: string;
  /** Guests pick an emoji instead of a photo. */
  emoji?: string;
};

type AuthState = {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
};

export const GUEST_EMOJIS = [
  '🧭',
  '🌴',
  '🎒',
  '🏔️',
  '🌊',
  '🛺',
  '🚲',
  '📷',
  '🍜',
  '🦜',
  '⛵',
  '🌋',
];

export function makeGuest(name: string, emoji: string): AppUser {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return { uid: `guest-${id}`, name: name.trim().slice(0, 40), provider: 'guest', emoji };
}

/** "Muhammad Hasan" → "Muhammad", for greetings. */
export function firstName(user: AppUser | null): string {
  return user?.name.trim().split(/\s+/)[0] ?? '';
}

/**
 * The signed-in profile, remembered on the device so the app opens straight
 * to the dashboard. For Google users the Firebase session is re-checked in the
 * background (see services/firebase.ts).
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: 'voyara.auth', version: 1 },
  ),
);
