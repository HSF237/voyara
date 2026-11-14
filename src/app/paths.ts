/**
 * Every URL in the app, in one place.
 *
 * Public:  /  (landing)   /login   /design
 * App (needs a profile): /home  /trips  /plan/new  /plan/:tripId  /settings
 *
 * Planned (later milestones):
 *   /plan/:tripId/swipe  swipe deck
 *   /plan/:tripId/today  trip-day mode
 *   /group/:roomId       group planning room
 *   /trip/:tripId        public read-only share page
 *   /sources             data sources & credits
 */
export const paths = {
  home: '/',
  login: '/login',
  dashboard: '/home',
  trips: '/trips',
  setup: '/plan/new',
  plan: '/plan/:tripId',
  settings: '/settings',
  design: '/design',
} as const;

export const planPath = (tripId: string) => `/plan/${encodeURIComponent(tripId)}`;

/** Only in-app paths are accepted as the place to go after sign-in (no open redirects). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : paths.dashboard;
}
