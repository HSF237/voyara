import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from '@/features/landing/LandingPage';
import { AppLayout } from './layout/AppLayout';
import { PublicLayout } from './layout/PublicLayout';
import { NotFoundPage } from './NotFoundPage';
import { PageFallback } from './PageFallback';
import { paths } from './paths';
import { RequireAuth } from './RequireAuth';
import { RouteError } from './RouteError';

/**
 * Three groups of routes:
 *  - public pages (landing, design system) in the public layout
 *  - sign-in, full screen
 *  - the app itself (dashboard, trips, planning, settings), which needs a profile
 *
 * The landing page ships in the main bundle; every other page is its own
 * chunk, downloaded on first visit.
 */
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageFallback />,
    children: [
      { path: paths.home, element: <LandingPage /> },
      {
        path: paths.design,
        lazy: async () => ({
          Component: (await import('@/features/design/DesignSystemPage')).DesignSystemPage,
        }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: paths.login,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageFallback />,
    lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).LoginPage }),
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageFallback />,
    children: [
      {
        path: paths.dashboard,
        lazy: async () => ({
          Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage,
        }),
      },
      {
        path: paths.trips,
        lazy: async () => ({ Component: (await import('@/features/trips/TripsPage')).TripsPage }),
      },
      {
        path: paths.setup,
        lazy: async () => ({ Component: (await import('@/features/setup/SetupPage')).SetupPage }),
      },
      {
        path: paths.plan,
        lazy: async () => ({ Component: (await import('@/features/plan/PlanPage')).PlanPage }),
      },
      {
        path: paths.settings,
        lazy: async () => ({
          Component: (await import('@/features/settings/SettingsPage')).SettingsPage,
        }),
      },
    ],
  },
]);
