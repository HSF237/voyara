import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Scene, type SceneName } from '@/components/Scene';
import type { Interest } from '@/features/trip/model';

const tiles: { interest: Interest; scene: SceneName }[] = [
  { interest: 'food', scene: 'food' },
  { interest: 'nature', scene: 'hills' },
  { interest: 'history', scene: 'heritage' },
  { interest: 'nightlife', scene: 'city' },
];

/** Illustrated shortcuts: start a trip with an interest already chosen. */
export function InterestTiles({
  title,
  onPick,
  className,
}: {
  title: string;
  onPick: (interest: Interest) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="by-interest" className={className}>
      <h2 id="by-interest" className="font-display text-2xl font-medium tracking-tight">
        {title}
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ interest, scene }) => (
          <li key={interest}>
            <motion.button
              type="button"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              onClick={() => onPick(interest)}
              className="block w-full overflow-hidden rounded-xl border border-line bg-surface text-start shadow-sm transition-shadow hover:shadow-lg"
            >
              <span className="block h-32 sm:h-36">
                <Scene name={scene} />
              </span>
              <span className="flex items-center justify-between gap-2 px-4 py-3.5 text-base font-semibold text-ink">
                {t(`interests.${interest}`)}
                <ArrowRight className="size-4 text-muted rtl:rotate-180" aria-hidden="true" />
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
    </section>
  );
}
