import { motion, type Variants } from 'framer-motion';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/paths';
import { HeroBanner } from '@/components/HeroBanner';
import { TripBar } from '@/components/TripBar';
import { cn } from '@/lib/cn';
import { flagEmoji, type Place } from '@/services/geocoding';
import { useTripDraft } from '@/store/tripDraft';
import { POPULAR } from './cities';

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

/** The landing hero: a travel photo, the promise, and the trip search card over its lower edge. */
export function Hero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selected = useTripDraft((state) => state.destination);
  const setDestination = useTripDraft((state) => state.setDestination);

  return (
    <motion.section variants={stage} initial="hidden" animate="show" className="relative">
      <HeroBanner className="min-h-[34rem] sm:min-h-[36rem]">
        <div className="container-page pt-14 pb-56 text-center text-white sm:pt-20 sm:pb-52">
          <motion.p
            variants={fadeUp}
            className="inline-flex h-7 items-center rounded-full bg-white/20 px-3 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm"
          >
            {t('home.eyebrow')}
          </motion.p>
          <h1 className="mx-auto mt-5 max-w-4xl font-display text-2xl font-normal tracking-tight drop-shadow-sm sm:text-3xl lg:text-4xl">
            <Words text={t('home.titleLead')} />{' '}
            <em>
              <Words text={t('home.titleEmphasis')} />
            </em>
          </h1>
          <motion.p variants={slideUp} className="mx-auto mt-4 max-w-xl text-lg opacity-95">
            {t('home.body')}
          </motion.p>
        </div>
      </HeroBanner>

      <motion.div variants={fadeUp} className="relative z-20 container-page -mt-48 sm:-mt-44">
        <TripBar onSubmit={() => void navigate(paths.setup)} className="mx-auto max-w-4xl" />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
        </div>
      </motion.div>
    </motion.section>
  );
}
