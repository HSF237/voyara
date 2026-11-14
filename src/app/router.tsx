import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/landing/HomePage';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './NotFoundPage';
import { PageFallback } from './PageFallback';
import { paths } from './paths';
import { RouteError } from './RouteError';

/**
 * The home page ships in the main bundle (it is the first thing people see);
 * every other page is its own chunk, downloaded on first visit.
 */
export const router = createBrowserRouter([
  {
    path: paths.home,
    element: <AppShell />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageFallback />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: paths.settings,
        lazy: async () => ({
          Component: (await import('@/features/settings/SettingsPage')).SettingsPage,
        }),
      },
      {
        path: paths.design,
        lazy: async () => ({
          Component: (await import('@/features/design/DesignSystemPage')).DesignSystemPage,
        }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
