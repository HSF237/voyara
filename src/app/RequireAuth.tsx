import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { paths } from './paths';

/** Sends visitors without a profile to sign-in, then back to where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user);
  const location = useLocation();
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={`${paths.login}?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}
