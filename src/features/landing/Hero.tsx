import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import { Hand } from 'lucide-react';
import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/paths';
import { useResolvedTheme } from '@/app/useResolvedTheme';
import { TripBar } from '@/components/TripBar';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { onIdle } from '@/lib/onIdle';
import { flagEmoji, type Place } from '@/services/geocoding';
import { useTripDraft } from '@/store/tripDraft';
import { POPULAR } from './cities';
import { GlobeFallback } from './globe/GlobeFallback';

// three.js is large: it is fetched after the page is interactive, never before.
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

const EASE = [0.16, 1, 0.3, 1] as const;

const stage: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const wordUp: Variants = {
  hidden: { y: '115%' },
  show: { y: 0, transition: { duration: 0.95, ease: EASE } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.35 } },
};
// The intro paragraph only slides: it stays visible from the first paint so
// the page's main text is on screen as early as possible.
const slideUp: Variants = {
  hidden: { y: 18 },
  show: { y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.2 } },
};

/** Each word in its own clipped box, so it can slide up into view. */
function Words({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={index}>
          <span className="-my-[0.14em] inline-block overflow-hidden py-[0.14em] align-bottom">
            <motion.span variants={wordUp} className="inline-block will-change-transform">
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 && ' '}
        </Fragment>
      ))}
    </>
  );
}

export function Hero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const theme = useResolvedTheme();
  const root = useRef<HTMLElement>(null);
  const [show3D, setShow3D] = useState(false);

  const selected = useTripDraft((state) => state.destination);
  const setDestination = useTripDraft((state) => state.setDestination);

  // Wait for the browser to go idle before downloading and starting the globe.
  useEffect(() => {
    if (!canRender3D()) return;
    return onIdle(() => setShow3D(true), 1500);
  }, []);

  // The globe sinks back slightly as the story below scrolls in.
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] });
  const globeY = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);
  const globeScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  return (
    <section ref={root} className="relative overflow-x-clip">
      <div className="container-page grid items-center gap-4 pt-10 pb-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-8">
        <motion.div variants={stage} initial="hidden" animate="show" className="relative z-10">
          <motion.div variants={fadeUp}>
            <Badge tone="success">{t('home.eyebrow')}</Badge>
          </motion.div>
          <h1 className="mt-5 font-display text-2xl font-normal tracking-tight text-ink sm:text-3xl xl:text-4xl">
            <Words text={t('home.titleLead')} />{' '}
            <em className="text-primary-ink">
              <Words text={t('home.titleEmphasis')} />
            </em>
          </h1>
          <motion.p variants={slideUp} className="mt-5 max-w-xl text-lg text-muted">
            {t('home.body')}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 max-w-xl">
            <TripBar stacked onSubmit={() => void navigate(paths.setup)} />

            <motion.div layout className="mt-4 flex flex-wrap items-center gap-2">
              <span className="me-1 text-sm text-muted">{t('home.popular')}</span>
              {POPULAR.map((place: Place) => (
                <button
                  key={place.id}
                  type="button"
                  aria-pressed={selected?.id === place.id}
                  onClick={() => setDestination(place)}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                    selected?.id === place.id
                      ? 'border-primary bg-primary-soft text-primary-ink'
                      : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
                  )}
                >
                  <span aria-hidden="true">{flagEmoji(place.countryCode)}</span>
                  {place.name}
                </button>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          style={reduced ? undefined : { y: globeY, scale: globeScale }}
          className="relative mx-auto -mb-10 aspect-square w-full max-w-[26rem] sm:max-w-[34rem] lg:mb-0 lg:max-w-none"
        >
          {show3D ? (
            <Suspense fallback={<GlobeFallback />}>
              <Globe focus={selected} theme={theme} reduced={reduced} />
            </Suspense>
          ) : (
            <GlobeFallback />
          )}
          {show3D && (
            <p
              className="pointer-events-none absolute inset-x-0 bottom-[6%] flex items-center justify-center gap-1.5 text-xs text-muted"
              aria-hidden="true"
            >
              <Hand className="size-3.5" />
              {t('home.dragHint')}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
