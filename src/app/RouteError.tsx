import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { CrashScreen } from './CrashScreen';
import { NotFoundPage } from './NotFoundPage';

/** Shown by the router when a route fails to load or throws while rendering. */
export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!notFound) console.error('Route error', error);
  }, [error, notFound]);

  return notFound ? (
    <div className="min-h-dvh bg-bg text-ink">
      <NotFoundPage />
    </div>
  ) : (
    <CrashScreen />
  );
}
