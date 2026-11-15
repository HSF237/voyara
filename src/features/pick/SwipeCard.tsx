import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Clock, ExternalLink, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Photo } from '@/components/Photo';
import { Scene } from '@/components/Scene';
import { categoryIcons, categoryLabel, categoryScenes } from '@/features/places/category';
import type { PlaceCandidate } from '@/planner/types';

export type Verdict = 'keep' | 'skip' | 'must';

const FAR = 110; // how far a card must travel to count as a decision
const FAST = 650; // or how hard it is flicked

/** Where a judged card flies to. Used as the exit animation. */
const flyAway = (verdict: Verdict | undefined) => ({
  x: verdict === 'keep' ? 520 : verdict === 'skip' ? -520 : 0,
  y: verdict === 'must' ? -620 : 40,
  rotate: verdict === 'keep' ? 18 : verdict === 'skip' ? -18 : 0,
  opacity: 0,
  transition: { duration: 0.32, ease: [0.4, 0, 1, 1] as const },
});

type SwipeCardProps = {
  place: PlaceCandidate;
  /** 0 is the card on top; 1 and 2 peek out behind it. */
  depth: number;
  onVerdict: (verdict: Verdict) => void;
};

/** One place in the deck. Drag right to keep, left to skip, up for a must-do. */
export function SwipeCard({ place, depth, onVerdict }: SwipeCardProps) {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-10, 10]);
  const keepStamp = useTransform(x, [30, 120], [0, 1]);
  const skipStamp = useTransform(x, [-120, -30], [1, 0]);
  const mustStamp = useTransform(y, [-120, -40], [1, 0]);
  const Icon = categoryIcons[place.category];
  const top = depth === 0;

  function settle(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.y < -FAR && Math.abs(offset.x) < FAR) return onVerdict('must');
    if (offset.x > FAR || velocity.x > FAST) return onVerdict('keep');
    if (offset.x < -FAR || velocity.x < -FAST) return onVerdict('skip');
  }

  return (
    <motion.article
      aria-hidden={!top}
      aria-label={top ? place.name : undefined}
      className="absolute inset-0 touch-none overflow-hidden rounded-[1.75rem] bg-surface shadow-lg select-none"
      style={top ? { x, y, rotate, zIndex: 3 } : { zIndex: 3 - depth }}
      initial={{ scale: 0.9, y: 36, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: depth > 2 ? 0 : 1 }}
      // The verdict arrives through AnimatePresence's `custom`, so a card that is
      // already leaving still learns which way to go.
      variants={{ gone: (verdict: Verdict | undefined) => flyAway(verdict) }}
      exit="gone"
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      drag={top}
      dragSnapToOrigin
      dragElastic={0.9}
      whileDrag={{ cursor: 'grabbing' }}
      onDragEnd={settle}
    >
      <Photo
        src={place.image}
        eager={depth < 2}
        fallback={
          <span className="absolute inset-0">
            <Scene name={categoryScenes[place.category]} />
          </span>
        }
        className="pointer-events-none"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/20" />

      <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-3">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-semibold text-[#14171a] shadow-sm">
          <Icon className="size-4" aria-hidden="true" />
          {categoryLabel(t, place.category)}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/45 px-3 text-sm font-medium text-white backdrop-blur-sm">
          <Clock className="size-3.5" aria-hidden="true" />
          {t('pick.visit', { count: place.durationMin })}
        </span>
      </div>

      {top && (
        <>
          <motion.span
            style={{ opacity: keepStamp }}
            className="pointer-events-none absolute start-6 top-20 -rotate-12 rounded-lg border-4 border-white bg-primary px-4 py-1.5 text-xl font-bold tracking-wide text-on-primary uppercase"
          >
            {t('pick.keep')}
          </motion.span>
          <motion.span
            style={{ opacity: skipStamp }}
            className="pointer-events-none absolute end-6 top-20 rotate-12 rounded-lg border-4 border-white bg-[#14171a] px-4 py-1.5 text-xl font-bold tracking-wide text-white uppercase"
          >
            {t('pick.skip')}
          </motion.span>
          <motion.span
            style={{ opacity: mustStamp }}
            className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-fit rounded-lg border-4 border-white bg-accent px-4 py-1.5 text-xl font-bold tracking-wide text-on-accent uppercase"
          >
            {t('pick.must')}
          </motion.span>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
        <h2 className="font-display text-2xl leading-tight font-medium tracking-tight text-balance">
          {place.name}
        </h2>
        {place.address && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{place.address}</span>
          </p>
        )}
        {place.summary && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/90">{place.summary}</p>
        )}
        {top && (place.wikipedia ?? place.imageSource) && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
            {place.wikipedia && (
              <a
                href={place.wikipedia}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                onPointerDownCapture={(event) => event.stopPropagation()}
              >
                {t('pick.readMore')}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
            {place.imageSource && (
              <a
                href={place.imageSource}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
                onPointerDownCapture={(event) => event.stopPropagation()}
              >
                {t('pick.photo')}
              </a>
            )}
          </p>
        )}
      </div>
    </motion.article>
  );
}
