import { useSyncExternalStore } from 'react';
import { useSettings } from '@/store/settings';
import { resolveTheme } from './sync';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(DARK_QUERY).matches;
const getServerSnapshot = () => false;

/** The theme actually on screen: "system" resolved to light or dark. */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useSettings((state) => state.theme);
  const systemPrefersDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return resolveTheme(preference, systemPrefersDark);
}
