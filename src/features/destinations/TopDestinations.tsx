import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoCredit } from '@/components/PhotoCredit';
import { Chip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { flagEmoji, type Place } from '@/services/geocoding';
import { DESTINATIONS, photoAt, THEMES, type Destination, type Theme } from './catalog';

function localTime(now: Date, timezone: string | undefined, language: string): string {
  if (!timezone) return '';
  try {
    return new Intl.DateTimeFormat(language, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(now);
  } catch {
    return '';
  }
}

function DestinationCard({
  place,
  now,
  onPick,
}: {
  place: Destination;
  now: Date;
  onPick: (place: Place) => void;
}) {
  const { t, i18n } = useTranslation();
  const [failed, setFailed] = useState(false);
  const time = localTime(now, place.timezone, i18n.language);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.3 }}
    >
      <button
        type="button"
        onClick={() => onPick(place)}
        aria-label={`${t('dash.planHere')}: ${place.name}, ${place.country}`}
        className="group block w-full text-start"
      >
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-surface-2 shadow-sm transition-shadow group-hover:shadow-lg">
          {failed ? (
            <span
              className="text-6xl absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              {flagEmoji(place.countryCode)}
            </span>
          ) : (
            <img
              src={photoAt(place.photo, 500)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-108"
            />
          )}
          {time && (
            <span
              className="absolute start-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white tabular-nums backdrop-blur-sm"
              dir="ltr"
            >
              {time}
            </span>
          )}
        </span>
        <span className="mt-3 block truncate text-base font-semibold text-ink">{place.name}</span>
        <span className="block truncate text-sm text-muted">
          <span aria-hidden="true">{flagEmoji(place.countryCode)} </span>
          {place.country}
        </span>
      </button>
      {!failed && <PhotoCredit photo={place.photo} className="mt-0.5 text-muted" />}
    </motion.li>
  );
}

type TopDestinationsProps = {
  title: string;
  onPick: (place: Place) => void;
  /** Shared clock, so every card's local time ticks together. */
  now: Date;
  className?: string;
};

/** Photo cards for featured destinations, filterable by the kind of trip. */
export function TopDestinations({ title, onPick, now, className }: TopDestinationsProps) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme | 'all'>('all');
  const shown = (
    theme === 'all' ? DESTINATIONS : DESTINATIONS.filter((item) => item.theme === theme)
  ).slice(0, 12);

  return (
    <section aria-labelledby="top-destinations" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id="top-destinations" className="font-display text-2xl font-medium tracking-tight">
          {title}
        </h2>
        <div role="group" aria-label={title} className="flex flex-wrap gap-2">
          {(['all', ...THEMES] as const).map((option) => (
            <Chip
              key={option}
              selected={theme === option}
              onSelectedChange={() => setTheme(option)}
              className={cn('h-9 px-3.5')}
            >
              {t(`themes.${option}`)}
            </Chip>
          ))}
        </div>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((place) => (
            <DestinationCard key={place.id} place={place} now={now} onPick={onPick} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
