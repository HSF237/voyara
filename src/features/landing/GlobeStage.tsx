import { useReducedMotion } from 'framer-motion';
import { Hand } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/app/useResolvedTheme';
import { cn } from '@/lib/cn';
import type { Place } from '@/services/geocoding';
import { GlobeFallback } from './globe/GlobeFallback';

// three.js is large: it is fetched only when the globe is about to be seen.
const Globe = lazy(() => import('./globe/Globe'));

/** WebGL available, and the device isn't asking us to go easy on it. */
function canRender3D(): boolean {
  try {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    if (nav.connection?.saveData) return false;
    if ((nav.deviceMemory ?? 8) <= 1 || (nav.hardwareConcurrency ?? 8) <= 2) return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** The interactive globe, loaded once it scrolls near the viewport. */
export function GlobeStage({ focus, className }: { focus: Place | null; className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion() ?? false;
  const theme = useResolvedTheme();
  const root = useRef<HTMLDivElement>(null);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node || !canRender3D() || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShow3D(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className={cn('relative aspect-square w-full', className)}>
      {show3D ? (
        <Suspense fallback={<GlobeFallback />}>
          <Globe focus={focus} theme={theme} reduced={reduced} />
        </Suspense>
      ) : (
        <GlobeFallback />
      )}
      {show3D && (
        <p
          className="pointer-events-none absolute inset-x-0 bottom-[4%] flex items-center justify-center gap-1.5 text-xs text-muted"
          aria-hidden="true"
        >
          <Hand className="size-3.5" />
          {t('home.dragHint')}
        </p>
      )}
    </div>
  );
}
