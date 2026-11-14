/**
 * Every URL in the app, in one place. Routes are registered in router.tsx as
 * the features behind them are built.
 *
 * Planned (later milestones):
 *   /plan/new            trip setup
 *   /plan/:tripId/swipe  swipe deck
 *   /plan/:tripId        plan view (timeline + map)
 *   /plan/:tripId/today  trip-day mode
 *   /group/:roomId       group planning room
 *   /trip/:tripId        public read-only share page
 *   /trips               saved trips
 *   /sources             data sources & credits
 */
export const paths = {
  home: '/',
  settings: '/settings',
  design: '/design',
} as const;
